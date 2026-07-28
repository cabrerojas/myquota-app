import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";
import type { CreditCard } from "@/shared/types/creditCard";

export interface CreateCardInput {
	cardType: string;
	cardHolderName: string;
	cardLastDigits: string;
	closingDay: number;
	dueDay: number;
	status?: string;
	nationalTotalLimit?: number;
	internationalTotalLimit?: number;
}

export interface FieldErrors {
	[field: string]: string;
}

export interface ApiError {
	message: string;
	fieldErrors?: FieldErrors;
}

export async function createCreditCard(
	data: CreateCardInput,
): Promise<CreditCard> {
	const response = await requestWithAuth(`${API_BASE_URL}/creditCards`, {
		method: "POST",
		body: JSON.stringify({
			...data,
			status: "active",
		}),
	});

	if (!response.ok) {
		const errorData: unknown = await response.json().catch(() => null);
		const err = errorData as Record<string, unknown> | null;
		const message =
			err && typeof err.message === "string"
				? err.message
				: `Error HTTP ${response.status}`;

		// If there are field-level validation errors, throw them structured
		if (err && err.errors) {
			throw { message, fieldErrors: err.errors } as ApiError;
		}
		throw new Error(message);
	}

	return response.json();
}
