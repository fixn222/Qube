"use client";

import { useEffect, useState } from "react";
import { createClient } from "qube-js";

const client = createClient(
    "http://localhost:3000/api/projects/test-7832b8",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9qZWN0SWQiOiJmZDUzNzVmMi0xMzdiLTRkMjItYjQwZC1lZWZlZmNhODJjMTUiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzg3NjAwNDE0LCJleHAiOjQ5NDMzNjA0MTR9.GTg4luKeUZIxRZAiuAaoNuoJOW1pDsRgJSuwnJ39mOc",
);

const table = "users";

export default function SdkTestPage() {
    const [rowId, setRowId] = useState("");
    const [name, setName] = useState("SDK test row");
    const [email, setEmail] = useState(
        `sdk-test-${Date.now()}@example.com`,
    );
    const [result, setResult] = useState("Ready");
    const [events, setEvents] = useState<string[]>([]);
    const [listening, setListening] = useState(false);
    const [realtimeStatus, setRealtimeStatus] = useState("Disconnected");

    useEffect(() => () => client.realTime.disconnect(), []);

    async function runAction(action: string, request: () => Promise<{
        data: unknown;
        error: string | null;
    }>) {
        setResult(`${action}…`);
        try {
            const response = await request();
            setResult(
                response.error ?? JSON.stringify(response.data, null, 2),
            );
        } catch (error) {
            setResult(error instanceof Error ? error.message : String(error));
        }
    }

    function readRows() {
        return runAction("Reading rows", () =>
            client.from(table).select("*").limit(10).execute(),
        );
    }

    function insertRow() {
        return runAction("Inserting row", () =>
            client.from(table).insert({ name, email }).execute(),
        );
    }

    function updateRow() {
        if (!rowId.trim()) {
            setResult("Enter a row ID before updating.");
            return;
        }
        return runAction("Updating row", () =>
            client.from(table).update({ name }).eq("id", rowId.trim()).execute(),
        );
    }

    function deleteRow() {
        if (!rowId.trim()) {
            setResult("Enter a row ID before deleting.");
            return;
        }
        return runAction("Deleting row", () =>
            client.from(table).delete().eq("id", rowId.trim()).execute(),
        );
    }

    function startRealtime() {
        if (listening) return;
        setEvents([]);
        client.realTime.subscribe(table, (event) => {
            setEvents((current) => [
                `${event.type}: ${JSON.stringify(event.record)}`,
                ...current,
            ].slice(0, 20));
        }, (status, message) => {
            setRealtimeStatus(message ? `${status}: ${message}` : status);
        });
        setRealtimeStatus("connecting");
        setListening(true);
    }

    function stopRealtime() {
        client.realTime.disconnect();
        setListening(false);
        setRealtimeStatus("Disconnected");
    }

    const inputStyle = {
        padding: "8px 10px",
        border: "1px solid #aaa",
        borderRadius: 6,
    };
    const buttonStyle = {
        padding: "8px 12px",
        border: "1px solid #888",
        borderRadius: 6,
        background: "white",
        cursor: "pointer",
    };
    const sectionStyle = {
        display: "grid",
        gap: 12,
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 10,
    };

    return (
        <main style={{ maxWidth: 760, margin: "0 auto", padding: 24, display: "grid", gap: 20 }}>
            <header>
                <h1>Qube SDK test</h1>
                <p>Database and realtime operations for the <code>{table}</code> table.</p>
            </header>

            <section style={sectionStyle} aria-labelledby="read-heading">
                <h2 id="read-heading">Read</h2>
                <div>
                    <button style={buttonStyle} onClick={readRows}>Load 10 rows</button>
                </div>
            </section>

            <section style={sectionStyle} aria-labelledby="write-heading">
                <h2 id="write-heading">Insert, update, and delete</h2>
                <label style={{ display: "grid", gap: 6 }}>
                    Name
                    <input style={inputStyle} value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                    Email (used for insert)
                    <input style={inputStyle} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                    Row ID (used for update and delete)
                    <input style={inputStyle} value={rowId} onChange={(event) => setRowId(event.target.value)} placeholder="Paste an ID from the read result" />
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button style={buttonStyle} onClick={insertRow}>Insert row</button>
                    <button style={buttonStyle} onClick={updateRow}>Update name</button>
                    <button style={buttonStyle} onClick={deleteRow}>Delete row</button>
                </div>
            </section>

            <section style={sectionStyle} aria-labelledby="realtime-heading">
                <h2 id="realtime-heading">Realtime</h2>
                <div>
                    {listening ? (
                        <button style={buttonStyle} onClick={stopRealtime}>Stop listening</button>
                    ) : (
                        <button style={buttonStyle} onClick={startRealtime}>Listen for changes</button>
                    )}
                    <span style={{ marginLeft: 10 }}>{realtimeStatus}</span>
                </div>
                <p style={{ margin: 0 }}>The <code>{table}</code> table must have realtime enabled on the project for changes to arrive.</p>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{events.length ? events.join("\n") : "No realtime events yet."}</pre>
            </section>

            <section style={sectionStyle} aria-labelledby="result-heading">
                <h2 id="result-heading">Latest result</h2>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{result}</pre>
            </section>
        </main>
    );
}
