import { z } from "zod";
export const itemDraftSchema = z.object({
  name: z.string().trim().min(1, "품목명을 입력해 주세요."),
  quantity: z.number().finite().positive("규격 수량은 0보다 커야 합니다."),
  unit: z.string().trim().min(1, "단위를 입력해 주세요."),
  price: z
    .number()
    .finite()
    .int("가격은 원 단위 정수로 입력해 주세요.")
    .positive("가격은 0보다 커야 합니다."),
});
export const registrationSchema = z.object({
  name: z.string().trim().min(1, "업체명을 입력해 주세요."),
  contact: z.string().trim().min(1, "공개용 연락처를 입력해 주세요."),
  address: z.string().trim().min(1, "업체 주소를 입력해 주세요."),
  items: z
    .array(itemDraftSchema)
    .min(1, "품목과 가격을 최소 1개 등록해 주세요."),
});
export type RegistrationDraft = z.infer<typeof registrationSchema>;
export function validateRegistration(input: unknown) {
  return registrationSchema.safeParse(input);
}
// Local form validation only. Real review/approval must be enforced on the server and DB.
