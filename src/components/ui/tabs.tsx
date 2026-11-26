"use client";

import { useState, type ReactNode } from "react";
import { Segmented, type SegmentOption } from "./segmented";

/**
 * Abas instantâneas: todas as seções já vêm do servidor e ficam montadas; trocar só mostra/esconde
 * (sem ida ao servidor) e a URL acompanha (?v=) para voltar na mesma aba.
 */
export function Tabs<T extends string>({ label, options, initial, path, panels }: {
  label: string;
  options: SegmentOption<T>[];
  initial: T;
  path: string;
  panels: Record<T, ReactNode>;
}) {
  const [tab, setTab] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setTab(initial);
  }
  return (
    <>
      <Segmented
        label={label}
        value={tab}
        options={options}
        onChange={(v) => {
          setTab(v);
          window.history.replaceState(null, "", `${path}?v=${v}`);
        }}
      />
      {options.map((o) => (
        <div key={o.value} hidden={o.value !== tab}>
          {panels[o.value]}
        </div>
      ))}
    </>
  );
}
