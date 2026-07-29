import { create } from 'zustand';

export type TicketCategory =
  | 'Funding'
  | 'Withdrawal'
  | 'Machine'
  | 'Rewards'
  | 'Referral'
  | 'Technical'
  | 'Account'
  | 'Fraud';

export type TicketPriority = 'Low' | 'Normal' | 'High' | 'Critical';
export type TicketStatus = 'Open' | 'Waiting for Customer' | 'Waiting for Admin' | 'In Progress' | 'Resolved' | 'Escalated';

export interface SupportMessage {
  id: string;
  sender: 'user' | 'admin' | 'system';
  senderName: string;
  text: string;
  createdAt: string;
  internalNote?: boolean;
  attachments?: string[];
}

export interface SupportTicket {
  id: string;
  reference: string;
  userTelegramId: string;
  userName: string;
  userUsername: string;
  userCountry: string;
  userBalanceUsdt: number;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  createdAt: string;
  updatedAt: string;
  assignedAgent?: string;
  escalatedTo?: string;
  messages: SupportMessage[];
  runningMachinesCount: number;
}

interface SupportState {
  tickets: SupportTicket[];
  selectedTicketId: string | null;
  knowledgeBaseArticles: Array<{ id: string; category: string; title: string; content: string }>;
  macros: Array<{ id: string; title: string; text: string }>;
  
  // Actions
  selectTicket: (id: string | null) => void;
  createTicket: (ticket: Omit<SupportTicket, 'id' | 'reference' | 'createdAt' | 'updatedAt' | 'messages'>, initialMessage: string) => void;
  replyTicket: (ticketId: string, text: string, isInternalNote?: boolean, senderName?: string) => void;
  escalateTicket: (ticketId: string, escalatedTo: string, note?: string) => void;
  resolveTicket: (ticketId: string) => void;
  updatePriority: (ticketId: string, priority: TicketPriority) => void;
  updateStatus: (ticketId: string, status: TicketStatus) => void;
}

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-001',
    reference: 'TKT-8849',
    userTelegramId: '74829103',
    userName: 'Kagiso Okello',
    userUsername: '@kokello',
    userCountry: 'Uganda',
    userBalanceUsdt: 124.50,
    category: 'Funding',
    priority: 'High',
    status: 'Waiting for Admin',
    subject: 'USSD Mobile Money Payment Pending Verification',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    runningMachinesCount: 2,
    messages: [
      {
        id: 'msg-1',
        sender: 'user',
        senderName: 'Kagiso Okello',
        text: 'I completed USSD payment prompt *165*1*1*0771234567*50# for 50 USDT deposit. Reference: KES-88291.',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'msg-2',
        sender: 'admin',
        senderName: 'TetherStream Automated Escrow',
        text: 'Your deposit session #KES-88291 was submitted to admin verification queue.',
        createdAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
        internalNote: true,
      },
    ],
  },
  {
    id: 'tkt-002',
    reference: 'TKT-9102',
    userTelegramId: '19482019',
    userName: 'Amina Nsabimana',
    userUsername: '@amina_n',
    userCountry: 'Kenya',
    userBalanceUsdt: 580.00,
    category: 'Machine',
    priority: 'Normal',
    status: 'Open',
    subject: 'Question on Pro Processing Unit Hashrate Upgrade',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    runningMachinesCount: 4,
    messages: [
      {
        id: 'msg-3',
        sender: 'user',
        senderName: 'Amina Nsabimana',
        text: 'Hi support team, if I upgrade my Cloud Machine tier to AI Matrix Core, does my existing cooler multiplier persist?',
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
    ],
  },
];

export const useSupportStore = create<SupportState>((set, get) => ({
  tickets: INITIAL_TICKETS,
  selectedTicketId: 'tkt-001',
  knowledgeBaseArticles: [
    {
      id: 'kb-1',
      category: 'Funding',
      title: 'How Mobile Money USSD Push Prompts Work (*165*1*1*)',
      content: 'When funding via Mobile Money, tap "Send Payment Push Prompt" to invoke native dialing code *165*1*1*(admin phone)*(amount)#. Funds are accredited upon admin confirmation.',
    },
    {
      id: 'kb-2',
      category: 'Machine',
      title: 'Spinner Overheat & Cool Down Protection',
      content: 'If the cooler bar reaches 100% capacity (20.2x multiplier), the spinner overheats and enters a 15-second cool down period to ensure fair distribution.',
    },
  ],
  macros: [
    {
      id: 'm-1',
      title: 'Deposit Pending Verification',
      text: 'Thank you! Your USSD mobile money payment reference is currently being verified against our admin ledger and will be accredited shortly.',
    },
    {
      id: 'm-2',
      title: 'Withdrawal Processing Policy',
      text: 'Withdrawals are processed instantly via our double-entry balance engine once verified.',
    },
  ],

  selectTicket: (id) => set({ selectedTicketId: id }),

  createTicket: (ticketData, initialMessageText) => {
    const id = `tkt-${Date.now()}`;
    const reference = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const newTicket: SupportTicket = {
      ...ticketData,
      id,
      reference,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'user',
          senderName: ticketData.userName,
          text: initialMessageText,
          createdAt: now,
        },
      ],
    };

    set((state) => ({
      tickets: [newTicket, ...state.tickets],
      selectedTicketId: id,
    }));
  },

  replyTicket: (ticketId, text, isInternalNote = false, senderName = 'Admin Operator') => {
    const now = new Date().toISOString();
    const newMessage: SupportMessage = {
      id: `msg-${Date.now()}`,
      sender: isInternalNote ? 'admin' : 'admin',
      senderName,
      text,
      createdAt: now,
      internalNote: isInternalNote,
    };

    set((state) => ({
      tickets: state.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          status: isInternalNote ? t.status : 'Waiting for Customer',
          updatedAt: now,
          messages: [...t.messages, newMessage],
        };
      }),
    }));
  },

  escalateTicket: (ticketId, escalatedTo, note) => {
    const now = new Date().toISOString();
    set((state) => ({
      tickets: state.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        const escMsg: SupportMessage = {
          id: `msg-esc-${Date.now()}`,
          sender: 'admin',
          senderName: 'System Escalation',
          text: `Ticket escalated to ${escalatedTo}.${note ? ` Reason: ${note}` : ''}`,
          createdAt: now,
          internalNote: true,
        };
        return {
          ...t,
          status: 'Escalated',
          escalatedTo,
          updatedAt: now,
          messages: [...t.messages, escMsg],
        };
      }),
    }));
  },

  resolveTicket: (ticketId) => {
    const now = new Date().toISOString();
    set((state) => ({
      tickets: state.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        const resMsg: SupportMessage = {
          id: `msg-res-${Date.now()}`,
          sender: 'system',
          senderName: 'System',
          text: 'Ticket resolved by support operator.',
          createdAt: now,
        };
        return {
          ...t,
          status: 'Resolved',
          updatedAt: now,
          messages: [...t.messages, resMsg],
        };
      }),
    }));
  },

  updatePriority: (ticketId, priority) => {
    set((state) => ({
      tickets: state.tickets.map((t) => (t.id === ticketId ? { ...t, priority, updatedAt: new Date().toISOString() } : t)),
    }));
  },

  updateStatus: (ticketId, status) => {
    set((state) => ({
      tickets: state.tickets.map((t) => (t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t)),
    }));
  },
}));
