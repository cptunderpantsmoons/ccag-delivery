"use client";

import { useState, useCallback } from "react";
import { Plus, CalendarDays, GripVertical, X, User } from "lucide-react";
import { AppShell } from "../../components/shell/app-shell";
import { PageHeader, StatusBadge } from "@/app/components/ui";

type Priority = "Critical" | "High" | "Medium" | "Low";
type ColumnId = "todo" | "in-progress" | "in-review" | "done";

interface Task {
  id: string;
  title: string;
  project: string;
  priority: Priority;
  assignee: { name: string; initials: string };
  dueDate: string;
  column: ColumnId;
}

const columns: { id: ColumnId; label: string; headerColor: string }[] = [
  { id: "todo", label: "To Do", headerColor: "bg-[var(--text-muted)]" },
  { id: "in-progress", label: "In Progress", headerColor: "bg-[var(--status-info)]" },
  { id: "in-review", label: "In Review", headerColor: "bg-[var(--status-warning)]" },
  { id: "done", label: "Done", headerColor: "bg-[var(--status-success)]" },
];

const priorities = ["All", "Critical", "High", "Medium", "Low"];

const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Validate Scope 3 emission factors for Q2 reporting",
    project: "Carbon Reporting",
    priority: "High",
    assignee: { name: "Sarah Chen", initials: "SC" },
    dueDate: "2026-04-25",
    column: "in-progress",
  },
  {
    id: "t2",
    title: "Review supplier sustainability questionnaire responses",
    project: "Supply Chain",
    priority: "Medium",
    assignee: { name: "James Wilson", initials: "JW" },
    dueDate: "2026-04-28",
    column: "todo",
  },
  {
    id: "t3",
    title: "Draft NGER compliance submission documentation",
    project: "Regulatory",
    priority: "Critical",
    assignee: { name: "Aisha Patel", initials: "AP" },
    dueDate: "2026-04-24",
    column: "in-progress",
  },
  {
    id: "t4",
    title: "Update baseline emissions inventory for new facility",
    project: "Carbon Reporting",
    priority: "High",
    assignee: { name: "Marcus Lee", initials: "ML" },
    dueDate: "2026-05-02",
    column: "todo",
  },
  {
    id: "t5",
    title: "Audit energy consumption data from Melbourne office",
    project: "Operations",
    priority: "Medium",
    assignee: { name: "Sarah Chen", initials: "SC" },
    dueDate: "2026-04-30",
    column: "in-review",
  },
  {
    id: "t6",
    title: "Prepare board presentation on net-zero roadmap",
    project: "Strategy",
    priority: "High",
    assignee: { name: "James Wilson", initials: "JW" },
    dueDate: "2026-05-05",
    column: "todo",
  },
  {
    id: "t7",
    title: "Verify solar panel installation carbon offset calculations",
    project: "Renewables",
    priority: "Low",
    assignee: { name: "Aisha Patel", initials: "AP" },
    dueDate: "2026-05-10",
    column: "done",
  },
  {
    id: "t8",
    title: "Reconcile flight emissions with travel platform API",
    project: "Operations",
    priority: "Medium",
    assignee: { name: "Marcus Lee", initials: "ML" },
    dueDate: "2026-04-27",
    column: "in-review",
  },
  {
    id: "t9",
    title: "Set up automated data pipeline from ERP to carbon platform",
    project: "Integrations",
    priority: "Critical",
    assignee: { name: "Sarah Chen", initials: "SC" },
    dueDate: "2026-05-01",
    column: "in-progress",
  },
  {
    id: "t10",
    title: "Complete waste audit for Sydney distribution centre",
    project: "Operations",
    priority: "Low",
    assignee: { name: "James Wilson", initials: "JW" },
    dueDate: "2026-05-08",
    column: "done",
  },
];

function getPriorityStatus(priority: Priority): "error" | "warning" | "info" | "neutral" {
  switch (priority) {
    case "Critical":
      return "error";
    case "High":
      return "warning";
    case "Medium":
      return "info";
    case "Low":
      return "neutral";
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function isOverdue(dateStr: string): boolean {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projectFilter, setProjectFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("Carbon Reporting");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("Medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState("Sarah Chen");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const projectOptions = ["All", ...Array.from(new Set(tasks.map((t) => t.project))).sort()];

  const filteredTasks = tasks.filter((task) => {
    if (projectFilter !== "All" && task.project !== projectFilter) return false;
    if (priorityFilter !== "All" && task.priority !== priorityFilter) return false;
    return true;
  });

  const getTasksByColumn = useCallback(
    (columnId: ColumnId) => filteredTasks.filter((t) => t.column === columnId),
    [filteredTasks]
  );

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      const el = e.target as HTMLElement;
      el.classList.add("opacity-40");
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const el = e.target as HTMLElement;
    el.classList.remove("opacity-40");
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedTaskId) return;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === draggedTaskId ? { ...task, column: columnId } : task
      )
    );
    setDraggedTaskId(null);
  };

  const assignees = [
    { name: "Sarah Chen", initials: "SC" },
    { name: "James Wilson", initials: "JW" },
    { name: "Aisha Patel", initials: "AP" },
    { name: "Marcus Lee", initials: "ML" },
  ];

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDueDate) return;

    const assignee = assignees.find((a) => a.name === newTaskAssignee) || assignees[0];

    const task: Task = {
      id: `t${Date.now()}`,
      title: newTaskTitle.trim(),
      project: newTaskProject,
      priority: newTaskPriority,
      assignee,
      dueDate: newTaskDueDate,
      column: "todo",
    };

    setTasks((prev) => [task, ...prev]);
    setNewTaskTitle("");
    setNewTaskProject("Carbon Reporting");
    setNewTaskPriority("Medium");
    setNewTaskAssignee("Sarah Chen");
    setNewTaskDueDate("");
    setIsModalOpen(false);
  }

  return (
    <AppShell title="Task Board">
      <div className="mx-auto max-w-7xl space-y-[var(--space-lg)]">
        <PageHeader
          title="Task Board"
          description="Manage carbon project tasks, compliance activities, and operational workflows."
          breadcrumbs={[
            { label: "Tasks", href: "/tasks" },
            { label: "Board" },
          ]}
          actions={
            <button
              onClick={() => setIsModalOpen(true)}
              className="carbon-button carbon-button-primary"
            >
              <Plus size={16} strokeWidth={1.5} />
              New Task
            </button>
          }
        />

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-[var(--space-md)] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-[var(--space-md)]">
          <div className="flex items-center gap-[var(--space-sm)]">
            <label className="text-xs font-medium text-[var(--text-tertiary)]">Project</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="carbon-input w-auto min-w-[140px] py-[var(--space-xs)] text-sm"
            >
              {projectOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-[var(--space-sm)]">
            <label className="text-xs font-medium text-[var(--text-tertiary)]">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="carbon-input w-auto min-w-[120px] py-[var(--space-xs)] text-sm"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-xs text-[var(--text-tertiary)]">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-[var(--space-md)] overflow-x-auto pb-[var(--space-md)]">
          {columns.map((column) => {
            const columnTasks = getTasksByColumn(column.id);
            const isDragOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                className={`flex min-w-[280px] flex-1 flex-col rounded-xl border transition-colors duration-200 ${
                  isDragOver
                    ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] p-[var(--space-md)]">
                  <div className="flex items-center gap-[var(--space-sm)]">
                    <div className={`h-2.5 w-2.5 rounded-full ${column.headerColor}`} />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{column.label}</h3>
                    <span className="rounded-full bg-[var(--deep)] px-2 py-[2px] text-[11px] font-medium text-[var(--text-secondary)]">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Content */}
                <div className="flex-1 space-y-[var(--space-sm)] p-[var(--space-md)]">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className="group cursor-grab rounded-xl border border-[var(--border)] bg-[var(--elevated)]/40 p-[var(--space-md)] transition-all duration-[var(--duration-fast)] hover:border-[var(--border-strong)] hover:bg-[var(--elevated)] hover:shadow-[var(--shadow-sm)] active:cursor-grabbing"
                    >
                      <div className="flex items-start gap-[var(--space-sm)]">
                        <GripVertical
                          size={16}
                          strokeWidth={1.5}
                          className="mt-0.5 shrink-0 text-[var(--text-muted)]"
                        />
                        <div className="min-w-0 flex-1 space-y-[var(--space-sm)]">
                          {/* Task Title */}
                          <h4 className="text-sm font-medium leading-snug text-[var(--text-primary)]">
                            {task.title}
                          </h4>

                          {/* Project Tag */}
                          <span className="inline-block rounded-full bg-[var(--deep)] px-2 py-[2px] text-[11px] text-[var(--text-secondary)]">
                            {task.project}
                          </span>

                          {/* Priority & Assignee Row */}
                          <div className="flex items-center justify-between">
                            <StatusBadge
                              status={getPriorityStatus(task.priority)}
                              label={task.priority}
                              size="sm"
                              dot={false}
                            />
                            <div className="flex items-center gap-[var(--space-xs)]">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-[var(--background)]">
                                {task.assignee.initials}
                              </div>
                              <span className="text-xs text-[var(--text-tertiary)]">
                                {task.assignee.name.split(" ")[0]}
                              </span>
                            </div>
                          </div>

                          {/* Due Date */}
                          <div
                            className={`flex items-center gap-[var(--space-xs)] text-xs ${
                              isOverdue(task.dueDate)
                                ? "text-[var(--status-error)]"
                                : "text-[var(--text-tertiary)]"
                            }`}
                          >
                            <CalendarDays size={12} strokeWidth={1.5} />
                            <span>{formatDate(task.dueDate)}</span>
                            {isOverdue(task.dueDate) && (
                              <span className="font-medium">Overdue</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-8 text-center">
                      <p className="text-sm text-[var(--text-tertiary)]">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-[var(--space-xl)] shadow-[var(--shadow-lg)] animate-scale-in">
            <div className="mb-[var(--space-lg)] flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                New Task
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--deep)] hover:text-[var(--text-primary)]"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-[var(--space-md)]">
              <div>
                <label className="mb-[var(--space-xs)] block text-xs font-medium text-[var(--text-secondary)]">
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task description..."
                  className="carbon-input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-[var(--space-md)]">
                <div>
                  <label className="mb-[var(--space-xs)] block text-xs font-medium text-[var(--text-secondary)]">
                    Project
                  </label>
                  <select
                    value={newTaskProject}
                    onChange={(e) => setNewTaskProject(e.target.value)}
                    className="carbon-input"
                  >
                    {projectOptions.filter((p) => p !== "All").map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-[var(--space-xs)] block text-xs font-medium text-[var(--text-secondary)]">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                    className="carbon-input"
                  >
                    {priorities.filter((p) => p !== "All").map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[var(--space-md)]">
                <div>
                  <label className="mb-[var(--space-xs)] block text-xs font-medium text-[var(--text-secondary)]">
                    Assignee
                  </label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="carbon-input"
                  >
                    {assignees.map((a) => (
                      <option key={a.name} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-[var(--space-xs)] block text-xs font-medium text-[var(--text-secondary)]">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="carbon-input"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-[var(--space-sm)] pt-[var(--space-sm)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="carbon-button carbon-button-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="carbon-button carbon-button-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
