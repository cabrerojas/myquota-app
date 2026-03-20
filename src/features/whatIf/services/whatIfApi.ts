import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";
import { WhatIfRequest, WhatIfResponse } from "../types/whatIf";

export const postWhatIf = async (
  payload: WhatIfRequest,
): Promise<WhatIfResponse> => {
  const res = await requestWithAuth(`${API_BASE_URL}/stats/what-if`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error en what-if: ${text}`);
  }
  return res.json();
};
