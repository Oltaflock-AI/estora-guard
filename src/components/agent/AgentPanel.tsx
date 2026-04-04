'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import type { AgentRole, ChatResponse, PolicyDecision, SecurityReceipt, SkillName } from '@/lib/agent/types';
import RoleSelector from './RoleSelector';
import PolicyDecisionBanner from './PolicyDecisionBanner';
import SecurityReceiptCard from './SecurityReceiptCard';
import ApprovalModal from './ApprovalModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  decision?: PolicyDecision;
  skillInvoked?: SkillName;
  reason?: string;
  receipt?: SecurityReceipt;
}

interface AgentPanelProps {
  transactionId: string;
}

export default function AgentPanel({ transactionId }: AgentPanelProps) {
  const [selectedRole, setSelectedRole] = useState<AgentRole>('transaction_coordinator');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{
    skillRequested: SkillName;
    reason: string;
    pendingActionId: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          transactionId,
          role: selectedRole,
        }),
      });

      const data = (await res.json()) as ChatResponse;

      const receipt: SecurityReceipt = {
        id: data.receiptId,
        transactionId,
        userId: '',
        role: selectedRole,
        request: trimmed,
        skillRequested: data.skillInvoked,
        decision: data.decision,
        reason: data.reason,
        approvedBy: null,
        attackCaseId: null,
        createdAt: new Date().toISOString(),
      };

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        decision: data.decision,
        skillInvoked: data.skillInvoked,
        reason: data.reason,
        receipt,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.requiresApproval && data.pendingActionId) {
        setPendingApproval({
          skillRequested: data.skillInvoked,
          reason: data.reason,
          pendingActionId: data.pendingActionId,
        });
      }
    } catch {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'An error occurred while processing your request.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(pendingActionId: string) {
    setLoading(true);
    setPendingApproval(null);

    try {
      const res = await fetch('/api/agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendingActionId,
          transactionId,
          role: selectedRole,
        }),
      });

      const data = (await res.json()) as ChatResponse;

      const receipt: SecurityReceipt = {
        id: data.receiptId,
        transactionId,
        userId: '',
        role: selectedRole,
        request: 'Approved action',
        skillRequested: data.skillInvoked,
        decision: 'allowed',
        reason: data.reason,
        approvedBy: 'current-user',
        attackCaseId: null,
        createdAt: new Date().toISOString(),
      };

      const approvalMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        decision: 'allowed',
        skillInvoked: data.skillInvoked,
        reason: data.reason,
        receipt,
      };

      setMessages((prev) => [...prev, approvalMessage]);
    } catch {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Failed to process approval.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleDenyApproval() {
    setPendingApproval(null);
    const denyMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Approval denied by user. The action was not executed.',
    };
    setMessages((prev) => [...prev, denyMessage]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full slide-in-right">
      <RoleSelector selectedRole={selectedRole} onRoleChange={setSelectedRole} />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 mt-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-12 h-12 text-gold mb-4" />
            <h3 className="font-display text-lg text-navy mb-2">Estora Guard Agent</h3>
            <p className="text-sm text-secondary max-w-sm">
              Ask about this deal — summary, risks, timeline, tasks, or next actions.
              Every action is logged and governed by the policy manifest.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            <div
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-gold" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-navy text-white'
                    : 'bg-surface-raised border border-border text-primary'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-navy" />
                </div>
              )}
            </div>

            {msg.decision && msg.skillInvoked && msg.reason && (
              <div className="ml-10">
                <PolicyDecisionBanner
                  decision={msg.decision}
                  skillInvoked={msg.skillInvoked}
                  reason={msg.reason}
                />
              </div>
            )}

            {msg.receipt && (
              <div className="ml-10">
                <SecurityReceiptCard receipt={msg.receipt} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-secondary text-sm ml-10">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the agent about this deal..."
            className="field-input flex-1"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="btn-gold"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {pendingApproval && (
        <ApprovalModal
          skillRequested={pendingApproval.skillRequested}
          reason={pendingApproval.reason}
          pendingActionId={pendingApproval.pendingActionId}
          onApprove={handleApprove}
          onDeny={handleDenyApproval}
        />
      )}
    </div>
  );
}
