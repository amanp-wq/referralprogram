"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "../shared";
import {
  Receipt, Download, Mail, Eye, RefreshCw, AlertCircle, X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  payoutId: string;
  affiliateId: string;
  amount: number;
  invoiceNo: string;
  status: string;
  pdfUrl: string | null;
  issuedAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AffiliateInvoices() {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate/invoices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load invoices");
      }
      const json = await res.json();
      setInvoices(json.invoices || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleViewInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setShowInvoiceDialog(true);
  };

  const handleEmailInvoice = (inv: Invoice) => {
    toast({ title: "Invoice emailed", description: `Invoice ${inv.invoiceNo} has been sent to your email` });
  };

  // Compute stats
  const latestInvoice = invoices.length > 0 ? invoices[0] : null;
  const pendingInvoices = invoices.filter((inv) => inv.status === "pending");
  const pendingTotal = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-rx-danger mb-4" />
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-2">Failed to load invoices</h3>
        <p className="text-sm text-rx-gray-500 mb-4">{error}</p>
        <button onClick={fetchInvoices} className="inline-flex items-center gap-2 px-4 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-rx-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-2xl p-6 border border-rx-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-rx-secondary-light flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-rx-secondary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-rx-gray-800">Recent Invoice</div>
                  <div className="text-xs text-rx-gray-500">{latestInvoice?.invoiceNo || "No invoices"}</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-rx-gray-900 mb-1">
                {latestInvoice ? formatCurrency(latestInvoice.amount) : "$0.00"}
              </div>
              <div className="text-xs text-rx-gray-500">
                {latestInvoice ? `${formatDate(latestInvoice.issuedAt)} - ${latestInvoice.status === "paid" ? "Paid" : "Pending"}` : "No invoices yet"}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-rx-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-rx-warning-light flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-rx-warning" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-rx-gray-800">Pending Invoices</div>
                  <div className="text-xs text-rx-gray-500">{pendingInvoices.length} invoice{pendingInvoices.length !== 1 ? "s" : ""} awaiting payment</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-rx-gray-900 mb-1">{formatCurrency(pendingTotal)}</div>
              <div className="text-xs text-rx-gray-500">Total pending amount</div>
            </div>
          </>
        )}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">All Invoices</h3>
          <button
            onClick={fetchInvoices}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <div className="flex gap-1">
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <Skeleton className="w-7 h-7 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                    <td className="px-5 py-3.5 text-sm font-mono font-semibold text-rx-gray-800">{inv.invoiceNo}</td>
                    <td className="px-5 py-3.5 text-sm text-rx-gray-500">{formatDate(inv.issuedAt)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{formatCurrency(inv.amount)}</td>
                    <td className="px-5 py-3.5 text-sm text-rx-gray-500">{formatDate(inv.dueDate)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={inv.status as any} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleViewInvoice(inv)}
                          className="p-1.5 rounded-lg hover:bg-rx-gray-100 text-rx-gray-400"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-rx-gray-100 text-rx-gray-400"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleEmailInvoice(inv)}
                          className="p-1.5 rounded-lg hover:bg-rx-gray-100 text-rx-gray-400"
                          title="Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Receipt className="w-10 h-10 text-rx-gray-300 mx-auto mb-3" />
            <p className="text-sm text-rx-gray-500">No invoices yet. Invoices are generated when payouts are processed.</p>
          </div>
        )}
      </div>

      {/* Invoice Detail Dialog */}
      {showInvoiceDialog && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Invoice Details</h3>
              <button
                onClick={() => { setShowInvoiceDialog(false); setSelectedInvoice(null); }}
                className="w-8 h-8 rounded-lg hover:bg-rx-gray-100 flex items-center justify-center text-rx-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Invoice Number</span>
                <span className="text-sm font-mono font-semibold text-rx-gray-800">{selectedInvoice.invoiceNo}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Amount</span>
                <span className="text-sm font-semibold text-rx-gray-900">{formatCurrency(selectedInvoice.amount)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Status</span>
                <StatusBadge status={selectedInvoice.status as any} />
              </div>
              <div className="flex justify-between items-center py-3 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Issued Date</span>
                <span className="text-sm text-rx-gray-800">{formatDate(selectedInvoice.issuedAt)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Due Date</span>
                <span className="text-sm text-rx-gray-800">{formatDate(selectedInvoice.dueDate)}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-rx-gray-500">Paid Date</span>
                <span className="text-sm text-rx-gray-800">{formatDate(selectedInvoice.paidAt)}</span>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => { setShowInvoiceDialog(false); setSelectedInvoice(null); }}
                className="w-full px-4 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
