import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  ExternalLink,
  Link2,
  Pause,
  Play,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";

import GlobalLoader from "@/components/GlobalLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getFunctionErrorMessage } from "@/utils/functionErrors";

type Integration = {
  id: string;
  source_url: string;
  source_type: string;
  status: "active" | "paused" | "disconnected" | "error";
  sync_interval_minutes: number;
  last_sync_completed_at: string | null;
  next_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  last_items_found: number;
  last_items_created: number;
  last_items_updated: number;
  last_items_removed: number;
};

type SyncRun = {
  id: string;
  status: string;
  trigger_type: string;
  items_found: number;
  items_created: number;
  items_updated: number;
  items_removed: number;
  items_skipped: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-CA", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not yet";

export default function DealerInventorySync() {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [interval, setIntervalValue] = useState("60");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data: integrationData, error } = await (supabase as any)
      .from("inventory_integrations")
      .select("*")
      .eq("dealer_id", auth.user.id)
      .maybeSingle();

    if (error) {
      toast.error("Could not load inventory connection.");
      setLoading(false);
      return;
    }

    const nextIntegration = integrationData as Integration | null;
    setIntegration(nextIntegration);
    if (nextIntegration) {
      setSourceUrl(nextIntegration.source_url);
      setIntervalValue(String(nextIntegration.sync_interval_minutes || 60));
      setAuthorized(true);

      const { data: runData } = await (supabase as any)
        .from("inventory_sync_runs")
        .select("*")
        .eq("integration_id", nextIntegration.id)
        .order("started_at", { ascending: false })
        .limit(8);
      setRuns(runData || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const invoke = async (action: string, body: Record<string, unknown> = {}) => {
    if (busyAction) return;
    setBusyAction(action);
    try {
      const { data, error } = await supabase.functions.invoke("sync-dealer-inventory", {
        body: { action, ...body },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, "Inventory action failed."));
      if (data?.error) throw new Error(data.error);

      if (action === "connect") {
        const result = data?.result || {};
        toast.success(`Inventory connected. ${result.found || 0} vehicles found.`);
      } else if (action === "sync") {
        const result = data?.result || {};
        toast.success(`Sync complete: ${result.created || 0} added, ${result.updated || 0} updated, ${result.removed || 0} removed.`);
      } else if (action === "disconnect") {
        toast.success("Inventory disconnected. Existing listings are now manually editable.");
      } else {
        toast.success(action === "pause" ? "Automatic sync paused." : "Automatic sync resumed.");
      }
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Inventory action failed.");
      await load();
    } finally {
      setBusyAction("");
    }
  };

  const connect = () => {
    if (!sourceUrl.trim()) return toast.error("Enter your dealership inventory page or feed URL.");
    if (!authorized) return toast.error("Confirm that you are authorized to publish this inventory.");
    invoke("connect", {
      source_url: sourceUrl.trim(),
      source_type: "auto",
      sync_interval_minutes: Number(interval),
      authorization_confirmed: true,
    });
  };

  const disconnect = () => {
    if (!window.confirm("Disconnect automatic inventory sync? Existing vehicles will remain on 1ntel and become manually editable.")) return;
    invoke("disconnect");
  };

  if (loading) return <GlobalLoader className="py-20" />;

  const connected = integration && integration.status !== "disconnected";
  const statusTone = integration?.status === "active"
    ? "border-green-200 bg-green-50 text-green-800"
    : integration?.status === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Inventory Sync</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect your dealership inventory once. New vehicles, price changes, photos and sold vehicles will sync automatically.
        </p>
      </div>

      {!connected ? (
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b bg-slate-950 p-5 text-white sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-2.5"><DatabaseZap className="h-6 w-6" /></div>
              <div>
                <h2 className="text-lg font-semibold">Connect your inventory</h2>
                <p className="text-sm text-slate-300">No software name or technical setup required.</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <Label htmlFor="source-url">Dealership website, inventory page or feed URL</Label>
              <div className="relative mt-1.5">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="source-url"
                  type="url"
                  className="pl-9"
                  placeholder="https://dealer.ca/inventory"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                1ntel automatically detects supported website data, JSON/XML feeds and CSV feeds. An inventory-specific page works best.
              </p>
            </div>

            <div>
              <Label htmlFor="sync-interval">Automatic sync frequency</Label>
              <select
                id="sync-interval"
                value={interval}
                onChange={(event) => setIntervalValue(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="30">Every 30 minutes</option>
                <option value="60">Every hour</option>
                <option value="180">Every 3 hours</option>
                <option value="360">Every 6 hours</option>
                <option value="1440">Once a day</option>
              </select>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                checked={authorized}
                onChange={(event) => setAuthorized(event.target.checked)}
              />
              <span>
                I confirm that I am authorized by this dealership to import, publish and continuously synchronize its inventory on 1ntel.
              </span>
            </label>

            <Button className="w-full sm:w-auto" onClick={connect} disabled={busyAction === "connect"}>
              {busyAction === "connect" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {busyAction === "connect" ? "Finding inventory..." : "Find & Connect Inventory"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={`rounded-2xl border p-5 ${statusTone}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                {integration.status === "active" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                ) : integration.status === "error" ? (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <Pause className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <div>
                  <p className="font-semibold capitalize">Inventory sync {integration.status}</p>
                  <a
                    href={integration.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-sm underline"
                  >
                    {integration.source_url} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                  {integration.last_error && <p className="mt-2 text-sm font-medium">{integration.last_error}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => invoke("sync")} disabled={Boolean(busyAction)}>
                  <RefreshCw className={`h-4 w-4 ${busyAction === "sync" ? "animate-spin" : ""}`} />
                  Sync now
                </Button>
                {integration.status === "paused" ? (
                  <Button variant="outline" onClick={() => invoke("resume")} disabled={Boolean(busyAction)}>
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => invoke("pause")} disabled={Boolean(busyAction)}>
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                )}
                <Button variant="outline" className="text-red-600" onClick={disconnect} disabled={Boolean(busyAction)}>
                  <Unplug className="h-4 w-4" /> Disconnect
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Vehicles found", integration.last_items_found],
              ["Added last sync", integration.last_items_created],
              ["Updated last sync", integration.last_items_updated],
              ["Removed last sync", integration.last_items_removed],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-white p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Clock3 className="h-4 w-4" /> Last completed sync</p>
              <p className="mt-2 text-sm text-slate-600">{formatDate(integration.last_sync_completed_at)}</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><RefreshCw className="h-4 w-4" /> Next automatic sync</p>
              <p className="mt-2 text-sm text-slate-600">
                {integration.status === "paused"
                  ? "Automatic sync is paused"
                  : integration.status === "error"
                    ? `Automatic retry: ${formatDate(integration.next_sync_at)}`
                    : formatDate(integration.next_sync_at)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold text-slate-950">Recent sync activity</h2>
            </div>
            {runs.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No sync history yet.</p>
            ) : (
              <div className="divide-y">
                {runs.map((run) => (
                  <div key={run.id} className="flex flex-col gap-2 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium capitalize text-slate-900">{run.trigger_type} sync · {run.status}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(run.started_at)}</p>
                      {run.error_message && <p className="mt-1 text-xs font-medium text-red-600">{run.error_message}</p>}
                    </div>
                    <p className="text-xs text-slate-600">
                      Found {run.items_found} · Added {run.items_created} · Updated {run.items_updated} · Removed {run.items_removed}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
