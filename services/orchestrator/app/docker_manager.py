"""Docker Engine service manager for per-user agent containers.

Replaces Railway API calls with direct Docker socket management,
enabling self-hosted PaaS functionality on a VPS.

When DOCKER_ENABLED is not set (or != "true"), this module operates in
no-op mode so the orchestrator can run on Coolify without per-user
container provisioning.
"""

import logging
import os
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Configuration defaults (can be overridden via environment variables)
DOCKER_ENABLED = os.getenv("DOCKER_ENABLED", "false").lower() == "true"
DOCKER_NETWORK = os.getenv("DOCKER_NETWORK", "carbon-agent-net")
BASE_IMAGE = os.getenv("AGENT_DOCKER_IMAGE", "carbon-agent-adapter:latest")
ADAPTER_PORT = int(os.getenv("ADAPTER_PORT", "8001"))

# Traefik configuration for path-based routing
DOMAIN = os.getenv("AGENT_DOMAIN", "agents.carbon.dev")
TRAEFIK_ENTRYPOINT = os.getenv("TRAEFIK_ENTRYPOINT", "websecure")
AGENT_BASE_PATH = os.getenv("AGENT_BASE_PATH", "/agent")

# Lazy import so docker-py is not required when DOCKER_ENABLED=false
_docker = None
_LogConfig = None


def _lazy_import_docker():
    global _docker, _LogConfig
    if _docker is None:
        import docker as _docker_mod
        from docker.types import LogConfig as _LogConfig_mod
        _docker = _docker_mod
        _LogConfig = _LogConfig_mod
    return _docker, _LogConfig


class DockerServiceManager:
    """Manages user agent containers via Docker Engine API.

    When DOCKER_ENABLED=false, all methods are no-ops and return safe
    defaults so the orchestrator can run without a Docker daemon.
    """

    def __init__(self):
        self._client: Optional[Any] = None
        self._enabled = DOCKER_ENABLED
        if self._enabled:
            logger.info("DockerServiceManager initialised (lazy Docker connection)")
        else:
            logger.info("DockerServiceManager initialised in no-op mode (DOCKER_ENABLED=false)")

    def _get_client(self) -> Any:
        """Return the Docker client, connecting lazily on first call."""
        if not self._enabled:
            raise RuntimeError("Docker is not enabled (DOCKER_ENABLED=false)")
        if self._client is None:
            docker_mod, _ = _lazy_import_docker()
            try:
                self._client = docker_mod.from_env()
                logger.info("DockerServiceManager: connected to Docker daemon")
            except Exception as e:
                logger.error(f"Failed to connect to Docker daemon: {e}")
                raise
        return self._client

    async def ensure_user_service(
        self, user_id: str, env_vars: Dict[str, str]
    ) -> Dict[str, Any]:
        if not self._enabled:
            return {"action": "noop", "container_id": None, "was_created": False}

        container_name = f"agent-{user_id}"
        docker_mod, _ = _lazy_import_docker()

        try:
            container = self._get_client().containers.get(container_name)
            if container.status != "running":
                logger.info(f"Starting stopped container for user {user_id}")
                container.start()
                return {
                    "action": "started",
                    "container_id": container.id,
                    "was_created": False,
                }
            return {
                "action": "running",
                "container_id": container.id,
                "was_created": False,
            }
        except docker_mod.errors.NotFound:
            logger.info(f"Provisioning new container for user {user_id}")
            return await self._create_user_container(user_id, env_vars)
        except docker_mod.errors.APIError as e:
            logger.error(f"Docker API error for user {user_id}: {e}")
            raise

    async def _create_user_container(
        self, user_id: str, env_vars: Dict[str, str]
    ) -> Dict[str, Any]:
        container_name = f"agent-{user_id}"
        container_env = {
            "USER_ID": user_id,
            "ADAPTER_PORT": str(ADAPTER_PORT),
            **env_vars,
        }
        mem_limit = os.getenv("AGENT_MEMORY_LIMIT", "512m")
        nano_cpus = int(os.getenv("AGENT_CPU_NANOS", "500000000"))
        labels = {
            "traefik.enable": "true",
            f"traefik.http.routers.{user_id}.rule": f"PathPrefix(`{AGENT_BASE_PATH}/{user_id}`)",
            f"traefik.http.routers.{user_id}.entrypoints": TRAEFIK_ENTRYPOINT,
            f"traefik.http.routers.{user_id}.tls": "true",
            f"traefik.http.routers.{user_id}.middlewares": f"{user_id}-strip",
            f"traefik.http.middlewares.{user_id}-strip.stripprefix.prefixes": f"{AGENT_BASE_PATH}/{user_id}",
            f"traefik.http.services.{user_id}.loadbalancer.server.port": str(ADAPTER_PORT),
            "carbon.user_id": user_id,
            "carbon.type": "agent-instance",
        }

        docker_mod, LogConfig = _lazy_import_docker()
        try:
            try:
                self._get_client().networks.get(DOCKER_NETWORK)
            except docker_mod.errors.NotFound:
                logger.info(f"Creating Docker network: {DOCKER_NETWORK}")
                self._get_client().networks.create(DOCKER_NETWORK, driver="bridge")

            container = self._get_client().containers.run(
                image=BASE_IMAGE,
                name=container_name,
                environment=container_env,
                labels=labels,
                network=DOCKER_NETWORK,
                detach=True,
                restart_policy={"Name": "unless-stopped"},
                mem_limit=mem_limit,
                nano_cpus=nano_cpus,
                read_only=True,
                tmpfs={"/tmp": "rw,noexec,nosuid,size=50m"},
                log_config=LogConfig(
                    type="json-file", config={"max-size": "10m", "max-file": "3"}
                ),
            )
            logger.info(f"Container created successfully: {container.id}")
            return {
                "action": "created",
                "container_id": container.id,
                "was_created": True,
            }
        except docker_mod.errors.APIError as e:
            logger.error(f"Failed to create container for {user_id}: {e}")
            raise

    async def spin_down_user_service(self, user_id: str):
        if not self._enabled:
            return
        container_name = f"agent-{user_id}"
        try:
            container = self._get_client().containers.get(container_name)
            if container.status == "running":
                container.stop(timeout=10)
                logger.info(f"Container stopped for user {user_id}")
        except Exception:
            pass

    async def destroy_user_service(self, user_id: str):
        if not self._enabled:
            return
        container_name = f"agent-{user_id}"
        try:
            container = self._get_client().containers.get(container_name)
            container.remove(force=True)
            logger.info(f"Container destroyed for user {user_id}")
        except Exception:
            pass

    async def get_container_status(self, user_id: str) -> str:
        if not self._enabled:
            return "noop"
        container_name = f"agent-{user_id}"
        try:
            container = self._get_client().containers.get(container_name)
            return container.status
        except Exception:
            return "missing"
