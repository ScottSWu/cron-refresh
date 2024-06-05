import { io, Socket } from "socket.io-client";

import styles from "./WsApp.module.scss";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { List } from "immutable";

function Status(props: { children: string }) {
  return (
    <div className={styles.status}>
      <h1>Status:</h1>
      <div>{props.children}</div>
    </div>
  );
}

function Log(props: { children: List<string> }) {
  const { children: logs } = props;

  return (
    <div className={styles.log}>
      <h1>Log</h1>
      <div>{logs.map((l, i) => <div key={i}>{l}</div>).toArray()}</div>
    </div>
  );
}

function getUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") ?? "";
}

function getTimeout() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("timeout") ?? "10000");
}

interface Request {
  index: number;
  url: string;
}

function useRequests(
  url: string,
  callback: (r: Request) => void
): {
  status: string;
} {
  const [status, setStatus] = useState<string>("Not connected");
  const [ws] = useState<Socket>(io(url));

  useEffect(() => {
    const handleConnect = () => {
      setStatus(`Connected (${url})`);
    };
    const handleDisconnect = () => {
      setStatus("Disconnected");
    };

    const handleRequest = (req: any) => {
      callback({
        index: req["index"],
        url: req["url"],
      });
    };

    ws.on("connect", handleConnect);
    ws.on("cr:req", handleRequest);
    ws.on("disconnect", handleDisconnect);

    return () => {
      ws.off("connect", handleConnect);
      ws.off("cr:req", handleRequest);
      ws.off("disconnect", handleDisconnect);
    };
  }, [ws, callback]);

  return { status };
}

function addToLog(setLog: Dispatch<SetStateAction<List<string>>>, r: Request) {
  const MAX_LOG_ITEMS = 100;
  setLog((prev) => {
    const next = prev.unshift(
      `${new Date().toISOString()} ${r.index} ${r.url}`
    );
    if (next.count() > MAX_LOG_ITEMS) {
      return next.pop();
    }
    return next;
  });
}

function useRefresher(): {
  log: List<string>;
  handleRequest: (r: Request) => void;
} {
  const [log, setLog] = useState<List<string>>(List());

  const handleRequest = useCallback((r: Request) => {
    const w = window.open(r.url);
    setTimeout(() => w?.close(), getTimeout());
    addToLog(setLog, r);
  }, []);

  return { log, handleRequest };
}

export default function WsApp() {
  const url = getUrl();
  const { log, handleRequest } = useRefresher();
  const { status } = useRequests(url, handleRequest);

  return (
    <div>
      <Status>{status}</Status>
      <Log>{log}</Log>
    </div>
  );
}
