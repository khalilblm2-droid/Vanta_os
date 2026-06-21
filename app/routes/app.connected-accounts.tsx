// VANTA OS — Connected Accounts (Phase 6 UI)
import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Link, ExternalLink, Trash2, ShieldCheck, AlertCircle } from "lucide-react";
import { useState } from "react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { SUPPORTED_ACCOUNT_TYPES, type AccountType, type ConnectedAccountInfo } from "~/lib/ai/agents/connected-accounts-types";
import { useToast } from "~/components/ui/Toaster";
import { formatRelativeTime } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const { listConnectedAccounts } = await import("~/lib/ai/agents/connected-accounts.server");
  const accounts = await listConnectedAccounts(ctx.shopDomain);
  return json({ shopDomain: ctx.shopDomain, staffId: ctx.staffId, accounts });
}

export function headers(_: HeadersArgs) { return getSecurityHeaders(); }

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const { connectAccount, revokeAccount, verifyAccount } = await import("~/lib/ai/agents/connected-accounts.server");

  if (body.action === "connect") {
    const id = await connectAccount(ctx.shopDomain, ctx.staffId, body.accountType, body.accountName, body.credentials, body.scopes ?? []);
    return json({ ok: true, id });
  }
  if (body.action === "revoke") {
    await revokeAccount(ctx.shopDomain, body.id);
    return json({ ok: true });
  }
  if (body.action === "verify") {
    const result = await verifyAccount(ctx.shopDomain, body.id);
    return json(result);
  }
  return json({ error: "Unknown" }, { status: 400 });
}

export default function ConnectedAccounts() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<AccountType>("LOGISTICS");
  const [accountName, setAccountName] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const selectedDef = SUPPORTED_ACCOUNT_TYPES.find((t) => t.type === selectedType)!;

  const handleConnect = () => {
    if (!accountName.trim() || Object.keys(credentials).length === 0) return;
    fetcher.submit({ action: "connect", accountType: selectedType, accountName, credentials, scopes: ["read", "write"] }, { method: "post", encType: "application/json" });
    toast.success("Account connected", "Credentials encrypted and stored securely.");
    setShowForm(false); setAccountName(""); setCredentials({});
  };

  const handleRevoke = (id: string, name: string) => {
    if (!confirm(`Revoke access to ${name}? All credentials will be permanently deleted.`)) return;
    fetcher.submit({ action: "revoke", id }, { method: "post", encType: "application/json" });
    toast.success("Account revoked", "Credentials deleted. All browser sessions closed.");
  };

  const handleVerify = (id: string) => {
    fetcher.submit({ action: "verify", id }, { method: "post", encType: "application/json" });
    toast.info("Verifying...", "Checking if credentials still work.");
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ExternalLink className="h-6 w-6" />Connected Accounts</h1>
        <p className="text-sm text-vanta-muted mt-1">Connect your merchant-owned accounts via official API keys. VANTA only operates them after your explicit authorization.</p>
      </div>

      <div className="vanta-card p-4 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">Your accounts stay yours</p>
            <p className="text-emerald-700 dark:text-emerald-300 mt-1">Credentials are encrypted with AES-256-GCM (. VANTA never assumes ownership. You can revoke access at any time — credentials are permanently deleted.</p>
          </div>
        </div>
      </div>

      {data.accounts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Connected ({data.accounts.length})</h2>
          {data.accounts.map((acc: ConnectedAccountInfo) => (
            <div key={acc.id} className="vanta-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{acc.accountName}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800">{acc.accountType}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${acc.status === "CONNECTED" ? "bg-emerald-100 text-emerald-700" : acc.status === "ERROR" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{acc.status}</span>
                  </div>
                  {acc.lastError && <p className="text-xs text-rose-500 mt-1">{acc.lastError}</p>}
                  {acc.lastVerifiedAt && <p className="text-[10px] text-vanta-muted mt-1">Verified {formatRelativeTime(acc.lastVerifiedAt, "en")}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleVerify(acc.id)} className="p-1.5 rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:opacity-80" title="Verify"><ShieldCheck className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleRevoke(acc.id, acc.accountName)} className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500" title="Revoke"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setShowForm(!showForm)} className="px-3 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700">+ Connect New Account</button>

      {showForm && (
        <div className="vanta-card p-5 space-y-4">
          <div>
            <label className="text-xs text-vanta-muted">Account type</label>
            <select value={selectedType} onChange={(e) => { setSelectedType(e.target.value as AccountType); setCredentials({}); }} className="mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm">
              {SUPPORTED_ACCOUNT_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>
            <p className="text-xs text-vanta-muted mt-1">{selectedDef.description}</p>
          </div>
          <div><label className="text-xs text-vanta-muted">Account name</label><input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder={`My ${selectedDef.label} Account`} className="mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm" /></div>
          <div className="space-y-2">
            {selectedDef.requiredFields.map((field) => (
              <div key={field}><label className="text-xs text-vanta-muted">{field}</label>
                <input type={field.includes("password") ? "password" : "text"} value={credentials[field] ?? ""} onChange={(e) => setCredentials({ ...credentials, [field]: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm" /></div>
            ))}
          </div>
          <div className="flex gap-2"><button onClick={handleConnect} disabled={!accountName.trim()} className="px-4 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 disabled:opacity-50">Connect</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-vanta-100 dark:bg-vanta-800 text-sm">Cancel</button></div>
          <p className="text-xs text-vanta-muted flex items-center gap-1"><AlertCircle className="h-3 w-3" />Credentials are encrypted before storage. Never shared with third parties.</p>
        </div>
      )}

      <Link to="/app/browser-agent" className="block vanta-card p-4 hover:border-vanta-400 transition">
        <p className="text-sm font-medium">→ Browser Agent Dashboard</p>
        <p className="text-xs text-vanta-muted mt-1">View and manage browser automation workflows powered by your connected accounts.</p>
      </Link>
    </div>
  );
}
