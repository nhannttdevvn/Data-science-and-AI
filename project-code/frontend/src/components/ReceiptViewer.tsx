import type { TokenPrediction, KIEField } from "../types";

const LABEL_COLORS: Record<string, string> = {
  STORE_NAME: "#3b82f6", // blue
  DATE_TIME: "#22c55e", // green
  ADDRESS: "#f97316", // orange
  TOTAL_PRICE: "#a855f7", // purple
};

function fieldFromLabel(label: string): KIEField | null {
  for (const key of ["COMPANY", "DATE", "ADDRESS", "TOTAL"] as const) {
    if (label === `B-${key}` || label === `I-${key}`)
      return key.toLowerCase() as KIEField;
  }
  return null;
}

interface Props {
  imageUrl: string;
  tokens: TokenPrediction[];
  activeField: KIEField | null;
}

const ReceiptViewer = ({ imageUrl, tokens, activeField }: Props) => {
  return (
    <div className="relative w-full overflow-hidden rounded border border-gray-200 bg-gray-50">
      <img src={imageUrl} alt="receipt" className="w-full block" />
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {tokens.map((tok, i) => {
          if (tok.label === "O") return null;
          const entity = fieldFromLabel(tok.label);
          const color = entity ? LABEL_COLORS[entity.toUpperCase()] : "#6b7280";
          const isActive = activeField !== null && entity === activeField;
          const [x0, y0, x1, y1] = tok.bbox;
          return (
            <rect
              key={i}
              x={x0}
              y={y0}
              width={x1 - x0}
              height={y1 - y0}
              fill={isActive ? color : "transparent"}
              fillOpacity={isActive ? 0.25 : 0}
              stroke={color}
              strokeWidth={isActive ? 8 : 4}
              strokeOpacity={0.85}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default ReceiptViewer;