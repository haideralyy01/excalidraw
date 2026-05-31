import React from "react";

interface DividerProps {
  text?: string;
}

export function Divider({ text }: DividerProps) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.line} />
      {text && <span style={styles.text}>{text}</span>}
      <div style={styles.line} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    width: "100%",
    margin: "4px 0",
  },
  line: {
    flex: 1,
    height: 1,
    background: "linear-gradient(90deg, transparent, #2e2e38, transparent)",
  },
  text: {
    fontSize: 12,
    color: "#6b6b7b",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    whiteSpace: "nowrap" as const,
    fontWeight: 500,
  },
};
