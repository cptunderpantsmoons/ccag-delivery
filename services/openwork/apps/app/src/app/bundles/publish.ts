import { createDenClient, readDenSettings, writeDenSettings } from "../lib/den";
import type {
  CcagServerClient,
  CcagWorkspaceExport,
  CcagWorkspaceExportSensitiveMode,
} from "../lib/ccag-server";
import type { SkillsSetBundleV1, WorkspaceProfileBundleV1 } from "./types";

export function buildWorkspaceProfileBundle(
  workspaceName: string,
  exported: CcagWorkspaceExport,
): WorkspaceProfileBundleV1 {
  return {
    schemaVersion: 1,
    type: "workspace-profile",
    name: `${workspaceName} template`,
    description: "Full CCAG workspace template with config, commands, skills, and portable .opencode files.",
    workspace: exported,
  };
}

export function buildSkillsSetBundle(
  workspaceName: string,
  exported: CcagWorkspaceExport,
): SkillsSetBundleV1 {
  const skills = Array.isArray(exported.skills) ? exported.skills : [];
  if (!skills.length) {
    throw new Error("No skills found in this workspace.");
  }

  return {
    schemaVersion: 1,
    type: "skills-set",
    name: `${workspaceName} skills`,
    description: "Complete skills set from an CCAG workspace.",
    skills: skills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      trigger: skill.trigger,
      content: skill.content,
    })),
  };
}

export async function publishWorkspaceProfileBundleFromWorkspace(input: {
  client: CcagServerClient;
  workspaceId: string;
  workspaceName: string;
  sensitiveMode?: Exclude<CcagWorkspaceExportSensitiveMode, "auto"> | null;
}) {
  const exported = await input.client.exportWorkspace(input.workspaceId, {
    sensitiveMode: input.sensitiveMode ?? undefined,
  });
  const payload = buildWorkspaceProfileBundle(input.workspaceName, exported);
  return input.client.publishBundle(payload, "workspace-profile", {
    name: payload.name,
  });
}

export async function publishSkillsSetBundleFromWorkspace(input: {
  client: CcagServerClient;
  workspaceId: string;
  workspaceName: string;
}) {
  const exported = await input.client.exportWorkspace(input.workspaceId, {
    sensitiveMode: "exclude",
  });
  const payload = buildSkillsSetBundle(input.workspaceName, exported);
  return input.client.publishBundle(payload, "skills-set", {
    name: payload.name,
  });
}

export async function saveWorkspaceProfileBundleToTeam(input: {
  client: CcagServerClient;
  workspaceId: string;
  workspaceName: string;
  requestedName: string;
  sensitiveMode?: Exclude<CcagWorkspaceExportSensitiveMode, "auto"> | null;
}) {
  const exported = await input.client.exportWorkspace(input.workspaceId, {
    sensitiveMode: input.sensitiveMode ?? undefined,
  });
  const fallbackName = `${input.workspaceName} template`;
  const name = input.requestedName.trim() || fallbackName;
  const payload = {
    ...buildWorkspaceProfileBundle(input.workspaceName, exported),
    name,
  } satisfies WorkspaceProfileBundleV1;

  const settings = readDenSettings();
  const token = settings.authToken?.trim() ?? "";
  if (!token) {
    throw new Error("Sign in to CCAG Cloud in Settings to share with your team.");
  }

  const cloudClient = createDenClient({ baseUrl: settings.baseUrl, apiBaseUrl: settings.apiBaseUrl, token });
  let orgId = settings.activeOrgId?.trim() ?? "";
  let orgSlug = settings.activeOrgSlug?.trim() ?? "";
  let orgName = settings.activeOrgName?.trim() ?? "";

  if (!orgSlug || !orgName) {
    const response = await cloudClient.listOrgs();
    const match = orgId
      ? response.orgs.find((org) => org.id === orgId)
      : response.orgs.find((org) => org.slug === orgSlug) ?? response.orgs[0];
    if (!match) {
      throw new Error("Choose an organization in Settings -> Cloud before sharing with your team.");
    }
    orgId = match.id;
    orgSlug = match.slug;
    orgName = match.name;
    writeDenSettings({
      ...settings,
      baseUrl: settings.baseUrl,
      authToken: token,
      activeOrgId: orgId,
      activeOrgSlug: orgSlug,
      activeOrgName: orgName,
    });
  }

  const created = await cloudClient.createTemplate(orgSlug, {
    name,
    templateData: payload,
  });

  return { created, orgName };
}
