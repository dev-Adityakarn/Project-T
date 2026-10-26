import { useState } from "react";
import { Send } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const SUBJECTS = [
  "General question",
  "Bug report",
  "Account or data request",
  "Leaderboard report",
  "Feature idea",
  "Press or partnership",
];

const EMPTY = {
  name: "",
  email: "",
  subject: SUBJECTS[0],
  message: "",
  website: "",
};

export const ContactForm = () => {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await api.post("/contact", form);
      setStatus("sent");
      setForm(EMPTY);
    } catch (err) {
      setStatus("error");
      const code = err?.response?.status;
      if (code === 429) {
        setError("Too many messages have been sent from this connection. Please try again later.");
      } else if (code === 422) {
        setError("Please check the name, email and message fields, then try again.");
      } else {
        setError("The message could not be sent. Check your connection and try again.");
      }
    }
  };

  if (status === "sent") {
    return (
      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-primary/40 bg-card p-6" data-testid="contact-success" role="status">
        <h2 className="text-xl font-semibold">Message received</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your message has been stored for the Typinger team. The email address you
          supplied is stored with it so the team can reply if needed.
        </p>
        <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={() => setStatus("idle")} data-testid="contact-send-another">
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-3xl rounded-2xl border bg-card p-6 sm:p-8" data-testid="contact-form">
      <h2 className="text-xl font-semibold">Send a message</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This form stores your message for the site owner. We do not publish a support
        email address. Include a valid email if you want a reply.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Your name
          <input
            type="text"
            value={form.name}
            onChange={update("name")}
            required
            maxLength={80}
            autoComplete="name"
            className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid="contact-name"
          />
        </label>
        <label className="text-sm font-medium">
          Email address
          <input
            type="email"
            value={form.email}
            onChange={update("email")}
            required
            maxLength={254}
            autoComplete="email"
            className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid="contact-email"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium">
        Subject
        <select
          value={form.subject}
          onChange={update("subject")}
          className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          data-testid="contact-subject"
        >
          {SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
        </select>
      </label>

      <label className="mt-4 block text-sm font-medium">
        Message
        <textarea
          value={form.message}
          onChange={update("message")}
          required
          minLength={10}
          maxLength={5000}
          rows={7}
          className="mt-1.5 w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          data-testid="contact-message"
        />
      </label>

      {/* Honeypot: real users never see or fill this field. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" value={form.website} onChange={update("website")} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {status === "error" && (
        <p className="mt-4 text-sm text-destructive" role="alert" data-testid="contact-error">{error}</p>
      )}

      <Button type="submit" disabled={status === "sending"} className="mt-6 rounded-full px-6 font-semibold" data-testid="contact-submit">
        <Send size={16} /> {status === "sending" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
};
