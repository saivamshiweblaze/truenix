"use client";

import { useState } from "react";
import { Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineSelect, SelectField, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useAppState } from "@/lib/store/store";
import { adminResetPermissions, adminSaveAdminAccount, adminSetPermission } from "@/lib/store/admin-actions";
import { ADMIN_MODULE_LABEL, ADMIN_ROLES, ALL_PERMISSIONS } from "@/lib/store/platform";
import { emailSchema } from "@/lib/validation";
import type { AdminAccount, AdminModuleId, AdminRoleId } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { AdminHeader, Block } from "../kit/layout";
import { AdminStatus, Flag } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";

const roleLabel = (r: AdminRoleId) => ADMIN_ROLES.find((x) => x.id === r)?.label ?? r;

function AccountDialog({ existing, onClose }: { existing?: AdminAccount; onClose: () => void }) {
  const s = useAppState();
  const [f, setF] = useState({ name: existing?.name ?? "", email: existing?.email ?? "", role: existing?.role ?? ("analyst" as AdminRoleId) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = "Enter a name.";
    if (!emailSchema.safeParse(f.email).success) e.email = "Enter a valid work email.";
    if (s.platform.adminTeam.some((a) => a.id !== existing?.id && a.email === f.email.trim().toLowerCase())) e.email = "An administrator with this email already exists.";
    setErrors(e);
    if (Object.keys(e).length) return;
    adminSaveAdminAccount({ id: existing?.id, name: f.name, email: f.email, role: f.role, status: existing?.status ?? "active", lastActiveAt: existing?.lastActiveAt });
    toast(existing ? "Administrator updated" : "Administrator account created", { body: existing ? undefined : "No invitation is emailed in this phase. Real accounts need the Phase 2 identity provider." });
    onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={existing ? `Edit ${existing.name}` : "New administrator"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{existing ? "Save changes" : "Create account"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} maxLength={100} />
        <TextField label="Work email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} />
        <SelectField label="Admin role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as AdminRoleId })} options={ADMIN_ROLES.map((r) => ({ value: r.id, label: r.label }))} hint={ADMIN_ROLES.find((r) => r.id === f.role)?.description} />
      </div>
    </Dialog>
  );
}

function Matrix() {
  const s = useAppState();
  const can = useCan();
  const confirm = useConfirm();
  const [role, setRole] = useState<AdminRoleId>("moderator");
  const editable = can("access", "manage_permissions") && role !== "super_admin";
  const modules = Object.keys(ADMIN_MODULE_LABEL) as AdminModuleId[];
  const perms = s.platform.rolePermissions[role] ?? {};
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="matrix-role" className="text-meta text-sub">
            Role
          </label>
          <InlineSelect id="matrix-role" value={role} onChange={(e) => setRole(e.target.value as AdminRoleId)} options={ADMIN_ROLES.map((r) => ({ value: r.id, label: r.label }))} />
        </div>
        {can("access", "manage_permissions") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              confirm.ask({
                title: "Reset every role to the default permissions?",
                consequences: ["All custom grants and revocations are replaced. The super administrator role is unaffected."],
                confirmLabel: "Reset permissions",
                danger: true,
                reason: "required",
                onConfirm: () => (adminResetPermissions(), toast("Permissions reset to defaults")),
              })
            }
          >
            Reset to defaults
          </Button>
        )}
      </div>
      <p className="text-meta text-sub">{ADMIN_ROLES.find((r) => r.id === role)?.description} {role === "super_admin" && "Super administrator access is fixed and can’t be reduced."}</p>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[56rem] text-left text-meta">
          <caption className="sr-only">Permissions for {roleLabel(role)}</caption>
          <thead className="bg-surface text-sub">
            <tr>
              <th scope="col" className="sticky left-0 bg-surface px-3 py-2 font-medium">
                Module
              </th>
              {ALL_PERMISSIONS.map((p) => (
                <th key={p} scope="col" className="px-2 py-2 text-center font-medium capitalize">
                  {p.replace("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m} className="border-t border-line">
                <th scope="row" className="sticky left-0 bg-paper px-3 py-1.5 font-medium text-ink">
                  {ADMIN_MODULE_LABEL[m]}
                </th>
                {ALL_PERMISSIONS.map((p) => {
                  const on = !!perms[m]?.includes(p);
                  return (
                    <td key={p} className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!editable}
                        aria-label={`${roleLabel(role)}: ${p.replace("_", " ")} ${ADMIN_MODULE_LABEL[m]}`}
                        onChange={(e) => adminSetPermission(role, m, p, e.target.checked)}
                        className="h-4 w-4 accent-[var(--color-ink)]"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirm.dialog}
    </div>
  );
}

export function AccessPage() {
  const s = useAppState();
  const can = useCan();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"admins" | "matrix">("admins");
  const [editing, setEditing] = useState<AdminAccount | "new" | null>(null);
  const manage = can("access", "manage_permissions");
  const me: AdminAccount | null = s.user ? { id: "me", name: s.user.name, email: s.user.email, role: s.platform.myAdminRole, status: "active", createdAt: s.user.joinedAt, lastActiveAt: new Date().toISOString(), demo: false } : null;
  const rows = [...(me ? [me] : []), ...s.platform.adminTeam];
  const columns: Column<AdminAccount>[] = [
    { id: "name", header: "Administrator", primary: true, sort: (a) => a.name, csv: (a) => a.name, cell: (a) => <span className="flex flex-wrap items-center gap-2">{a.name}{a.id === "me" && <Flag>You</Flag>}</span> },
    { id: "email", header: "Email", csv: (a) => a.email, cell: (a) => <span className="text-meta text-sub">{a.email}</span> },
    { id: "role", header: "Admin role", sort: (a) => roleLabel(a.role), csv: (a) => roleLabel(a.role), cell: (a) => <span className="text-meta">{roleLabel(a.role)}</span> },
    { id: "status", header: "Status", sort: (a) => a.status, csv: (a) => a.status, cell: (a) => <AdminStatus value={a.status} /> },
    { id: "last", header: "Last active", cell: (a) => <span className="text-meta text-sub">{a.lastActiveAt ? timeAgo(a.lastActiveAt) : "Never"}</span> },
    { id: "created", header: "Created", sort: (a) => a.createdAt, csv: (a) => a.createdAt.slice(0, 10), cell: (a) => <span className="text-meta text-sub">{formatDate(a.createdAt)}</span>, hideOnMobile: true },
    {
      id: "act",
      header: "",
      cell: (a) =>
        manage && a.id !== "me" ? (
          <span className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                confirm.ask({
                  title: `${a.status === "active" ? "Deactivate" : "Reactivate"} ${a.name}?`,
                  consequences: [a.status === "active" ? "They lose access to the admin portal. Their past actions stay in the audit log." : "They regain access with their current role."],
                  confirmLabel: a.status === "active" ? "Deactivate" : "Reactivate",
                  danger: a.status === "active",
                  reason: "required",
                  onConfirm: () => (adminSaveAdminAccount({ ...a, status: a.status === "active" ? "deactivated" : "active" }), toast(a.status === "active" ? "Administrator deactivated" : "Administrator reactivated")),
                })
              }
            >
              {a.status === "active" ? "Deactivate" : "Reactivate"}
            </Button>
          </span>
        ) : null,
    },
  ];
  return (
    <>
      <AdminHeader
        title="Admin roles and permissions"
        description="Administrator accounts and what each admin role may do. Only a super administrator can change accounts or permissions."
        actions={
          manage && (
            <Button size="sm" variant="accent" onClick={() => setEditing("new")}>
              <Plus size={15} aria-hidden /> New administrator
            </Button>
          )
        }
      />
      <div role="note" className="mb-6 flex gap-3 rounded-md border border-line bg-surface p-4 text-ui text-charcoal">
        <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
        <p>
          These permissions shape what the interface offers. They are <strong>not</strong> access control yet: data and checks run in this browser, and anyone with the browser can change them. Phase 2 must enforce this matrix on
          the server for every request, issue admin sessions through an identity provider with multi-factor sign-in, and write audit entries server-side.
        </p>
      </div>
      <Tabs
        label="Access views"
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: "admins", label: "Administrators", count: rows.length },
          { value: "matrix", label: "Permission matrix" },
        ]}
      />
      {tab === "admins" ? (
        <DataTable label="Administrators" module="access" rows={rows} columns={columns} getId={(a) => a.id} search={(a) => [a.name, a.email]} filters={[{ id: "role", label: "Role", options: ADMIN_ROLES.map((r) => ({ value: r.id, label: r.label })), test: (a, v) => a.role === v }]} exportName="truevix-administrators" />
      ) : (
        <Block title="Permission matrix" description="Ten permissions per module. Changes are logged.">
          <Matrix />
        </Block>
      )}
      {editing && <AccountDialog existing={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {confirm.dialog}
    </>
  );
}
