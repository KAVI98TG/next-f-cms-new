import { useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  ConfirmDialog,
  FormField,
  MetricCard,
  SectionHeader,
  TextInput,
} from "../../shared/components";
import { platformOperationsStore } from "../services/platformOperationsStore";
import { usePlatformOperations } from "../shared/usePlatformOperations";
import { useToast } from "../../shared/feedback/ToastProvider";

export function CleanupPage() {
  const stored = usePlatformOperations(platformOperationsStore.getRetention);
  const runs = usePlatformOperations(platformOperationsStore.getCleanupRuns);
  const [policy, setPolicy] = useState(stored);
  const [confirm, setConfirm] = useState(false);
  const { notify } = useToast();
  const save = () => {
    platformOperationsStore.saveRetention(policy);
    notify({ title: "Retention policy saved", tone: "success" });
  };
  const describe = (r: {
    removedAudit: number;
    removedLogs: number;
    removedNotifications: number;
    removedBackups: number;
  }) =>
    `${r.removedAudit} audit · ${r.removedLogs} logs · ${r.removedNotifications} notifications · ${r.removedBackups} backups`;
  const preview = () => {
    const r = platformOperationsStore.previewCleanup();
    notify({
      title: "Cleanup preview",
      description: `Would remove ${describe(r)}.`,
      tone: "info",
    });
  };
  return (
    <div className="page cleanup-page">
      <SectionHeader
        eyebrow="Platform"
        title="Cleanup & Retention"
        description="Control operational retention without broad business-record deletion."
      />
      <div className="compact-metrics">
        <MetricCard
          label="Audit retention"
          value={`${policy.auditDays} days`}
          detail="Sensitive action history"
          icon={Clock}
        />
        <MetricCard
          label="Log retention"
          value={`${policy.logDays} days`}
          detail="System log history"
          icon={Clock}
        />
        <MetricCard
          label="Backup retention"
          value={String(policy.backupCount)}
          detail="Application snapshots"
          icon={Trash2}
        />
        <MetricCard
          label="Cleanup runs"
          value={String(runs.filter((r) => r.mode === "executed").length)}
          detail="Executed"
          icon={Trash2}
        />
      </div>
      <Card>
        <div className="operation-section__head">
          <div>
            <span>Policy</span>
            <h3>Retention thresholds</h3>
          </div>
        </div>
        <div className="form-grid form-grid--two">
          <FormField label="Audit retention days">
            <TextInput
              type="number"
              min={30}
              value={policy.auditDays}
              onChange={(e) =>
                setPolicy({ ...policy, auditDays: Number(e.target.value) })
              }
            />
          </FormField>
          <FormField label="System log retention days">
            <TextInput
              type="number"
              min={7}
              value={policy.logDays}
              onChange={(e) =>
                setPolicy({ ...policy, logDays: Number(e.target.value) })
              }
            />
          </FormField>
          <FormField label="Notification retention days">
            <TextInput
              type="number"
              min={7}
              value={policy.notificationDays}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  notificationDays: Number(e.target.value),
                })
              }
            />
          </FormField>
          <FormField label="Backup count">
            <TextInput
              type="number"
              min={1}
              value={policy.backupCount}
              onChange={(e) =>
                setPolicy({ ...policy, backupCount: Number(e.target.value) })
              }
            />
          </FormField>
        </div>
        <div className="table-actions cleanup-actions">
          <Button onClick={save}>Save policy</Button>
          <Button onClick={preview}>Preview cleanup</Button>
          <Button variant="primary" onClick={() => setConfirm(true)}>
            Run cleanup
          </Button>
        </div>
      </Card>
      <Card>
        <div className="operation-section__head">
          <div>
            <span>History</span>
            <h3>Recent cleanup evaluations</h3>
          </div>
        </div>
        {runs.slice(0, 8).map((r) => (
          <div className="mini-record" key={r.id}>
            <div>
              <strong>{r.mode}</strong>
              <small>{new Date(r.createdAt).toLocaleString("en-LK")}</small>
            </div>
            <span>{describe(r)}</span>
          </div>
        ))}
      </Card>
      <ConfirmDialog
        open={confirm}
        title="Run cleanup now?"
        description="Only expired audit events, notifications, system logs and excess application snapshots will be removed. Business records are not included in this retention action."
        confirmLabel="Run cleanup"
        danger
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          const r = platformOperationsStore.runCleanup();
          notify({
            title: "Cleanup complete",
            description: `Removed ${describe(r)}.`,
            tone: "success",
          });
          setConfirm(false);
        }}
      />
    </div>
  );
}
