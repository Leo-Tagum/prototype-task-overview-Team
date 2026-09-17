import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/ui-bits";
import { IdentityPicker } from "@/components/IdentityPicker";
import { NewProjectForm, NewProjectDialog } from "@/components/NewProjectDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TaskList } from "@/components/TaskList";
import { SummaryBoard } from "@/components/SummaryBoard";
import { BriefingBoard } from "@/components/BriefingBoard";
import { CalendarPanel } from "@/components/CalendarPanel";
import { WorkloadPanel } from "@/components/WorkloadPanel";
import { KpiPanel } from "@/components/KpiPanel";
import { Overview } from "@/components/Overview";
import { TaskEditor } from "@/components/TaskEditor";
import { useTaskStore } from "@/lib/store";
import { claimIdentity, resolveViewer, useViewerId } from "@/lib/identity";
import type { CalendarMode } from "@/types";

type Tab = "overview" | "list" | "board" | "briefing" | "calendar" | "workload" | "kpi";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "list", label: "List" },
  { key: "board", label: "Board" },
  { key: "briefing", label: "Briefing" },
  { key: "calendar", label: "Calendar" },
  { key: "workload", label: "Workload" },
  { key: "kpi", label: "KPI" },
];

function App() {
  const { viewerId, setViewerId, effectiveId } = useViewerId();
  const store = useTaskStore(effectiveId);
  const { viewerPerson, needsPicker } = resolveViewer(viewerId, store.roster);

  const [switchingIdentity, setSwitchingIdentity] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [calendarAnchor, setCalendarAnchor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId && store.projects.length) setSelectedProjectId(store.projects[0].id);
    if (selectedProjectId && !store.projects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(store.projects[0]?.id ?? null);
    }
  }, [store.projects, selectedProjectId]);

  if (!store.ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (needsPicker || switchingIdentity) {
    return (
      <IdentityPicker
        roster={store.roster}
        onClaim={async (name) => {
          await claimIdentity(name, store.roster, store.addPerson, setViewerId);
          setSwitchingIdentity(false);
        }}
      />
    );
  }

  if (!store.projects.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
          <h1 className="font-display text-xl font-semibold">First, a project</h1>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Tasks live under a project. Create the first one — you can add more later.
          </p>
          <NewProjectForm onCreate={store.createProject} submitLabel="Create and continue" />
        </div>
      </div>
    );
  }

  const project = store.projects.find((p) => p.id === selectedProjectId) ?? store.projects[0];
  const openTask = store.tasks.find((t) => t.id === openTaskId) ?? null;
  const projectSiblings = openTask ? store.tasks.filter((t) => t.projectId === openTask.projectId) : [];
  const openTaskPhases = openTask
    ? store.phases.filter((p) => p.projectId === openTask.projectId).sort((a, b) => a.position - b.position)
    : [];

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <h1 className="font-display text-lg font-semibold">Task Tracker</h1>

        <Select value={project.id} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="h-8 w-[200px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {store.projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <NewProjectDialog onCreate={store.createProject} />
        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title={`Archive "${project.name}"`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          }
          title={`Archive "${project.name}"?`}
          description="Its tasks go with it — this can't be undone from here."
          confirmLabel="Archive project"
          onConfirm={() => store.archiveProject(project.id)}
        />

        <div className="ml-auto flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {store.roster
              .filter((p) => p.active)
              .slice(0, 6)
              .map((p) => (
                <InitialsAvatar key={p.id} person={p} size={22} className="ring-2 ring-background" />
              ))}
          </div>
          <button
            type="button"
            onClick={() => setSwitchingIdentity(true)}
            className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/40"
          >
            <InitialsAvatar person={viewerPerson} size={18} />
            Viewing as {viewerPerson?.name ?? "…"}
          </button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="border-b border-border px-4">
        <TabsList className="h-10">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <main className="flex-1">
        {activeTab === "overview" && (
          <Overview
            tasks={store.tasks}
            projects={store.projects}
            phases={store.phases}
            roster={store.roster}
            selectedProject={project}
            onOpenTask={setOpenTaskId}
            onCreatePhase={(name, why, targetMonth) => store.createPhase(project.id, name, why, targetMonth)}
            onUpdateGoal={(goal, goalWhy) => store.updateProjectGoal(project.id, goal, goalWhy)}
          />
        )}
        {activeTab === "list" && (
          <TaskList
            projectId={project.id}
            tasks={store.tasks}
            roster={store.roster}
            onOpenTask={setOpenTaskId}
            onUpdateTask={store.updateTask}
            onInsertAfter={(taskId, afterId) => store.insertAfter(project.id, taskId, afterId)}
            onPaste={(titles, defaults) => store.createTasksFromPaste(project.id, titles, defaults)}
          />
        )}
        {activeTab === "board" && (
          <SummaryBoard
            projectId={project.id}
            tasks={store.tasks}
            roster={store.roster}
            viewerId={effectiveId}
            onOpenTask={setOpenTaskId}
            onPaste={(titles, defaults) => store.createTasksFromPaste(project.id, titles, defaults)}
          />
        )}
        {activeTab === "briefing" && (
          <BriefingBoard
            projectId={project.id}
            tasks={store.tasks}
            roster={store.roster}
            onOpenTask={setOpenTaskId}
            onUpdateTask={store.updateTask}
          />
        )}
        {activeTab === "calendar" && (
          <div className="p-3">
            <CalendarPanel
              tasks={store.tasks}
              roster={store.roster}
              mode={calendarMode}
              onModeChange={setCalendarMode}
              anchor={calendarAnchor}
              onAnchorChange={setCalendarAnchor}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onOpenTask={setOpenTaskId}
            />
          </div>
        )}
        {activeTab === "workload" && (
          <WorkloadPanel tasks={store.tasks} roster={store.roster} onChangeCapacity={store.updatePersonCapacity} />
        )}
        {activeTab === "kpi" && <KpiPanel tasks={store.tasks} roster={store.roster} />}
      </main>

      <TaskEditor
        open={!!openTask}
        onOpenChange={(o) => {
          if (!o) setOpenTaskId(null);
        }}
        task={openTask}
        siblings={projectSiblings}
        phases={openTaskPhases}
        roster={store.roster}
        onUpdate={(patch) => openTask && store.updateTask(openTask.id, patch)}
        onArchive={() => openTask && store.archiveTask(openTask.id)}
        onAddComment={(body) => openTask && store.addComment(openTask.id, body)}
      />
    </div>
  );
}

export default App;
