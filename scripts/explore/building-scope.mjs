// Measured west annex volume: the dark roof and its supporting building.
// Main building starts at x=-7.5366. Keep shared boundary-only surfaces.
export function isAnnex(box){return box.min.x < -7.55 && box.max.x <= -7.28 && box.min.z >= -43.65 && box.max.z <= -20.60 && box.min.y >= 1.35 && box.max.y <= 19.5;}
