export type ShapeType = "rectangle" | "diamond" | "circle" | "line" | "arrow";

export interface Shape {
    id: string;
    type: ShapeType;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    /** For line/arrow: ordered array of [x, y] world-coord points (min 2).
     *  When present, x1/y1/x2/y2 are the bounding box of all points. */
    points?: [number, number][];
    options: {
        stroke: string;
        strokeWidth: number;
        roughness: number;
        fill?: string;
        fillStyle?: string;
        seed?: number;
    }
}

/** Handle positions on a shape's bounding box */
export type HandleId =
    | "nw" | "n" | "ne"
    | "w"  |        "e"
    | "sw" | "s" | "se"
    | "rotate";

/** Handle position for a line/arrow point node */
export interface PointHandle {
    type: "point";
    index: number; // index into shape.points[]
}

/** Handle position for a midpoint (between two line points) */
export interface MidpointHandle {
    type: "midpoint";
    index: number; // insert after this index in shape.points[]
}

export type LineHandle = PointHandle | MidpointHandle;