import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Dimensions } from "react-native";
import vendors from "../../data/vendors.json";
import type { VendorCard } from "../../core/search-types";
import type { AiFailureDetail, AskSlot, Option, PartialCondition, Slot } from "../lib/api-types";
import type { Location } from "../lib/api-types";
import {
  ApiError,
  getLocations,
  NetworkError,
  postPhotoCheck,
  registerDevice,
  requestItem as postItemRequest,
  searchByCondition,
  sendEvent,
  sendTurn,
  sharePriceCheck,
} from "../lib/api";
import { PhotoError, pickPhoto } from "../lib/photo";
import { getSavedLocation, saveLocation } from "../lib/location";
import { type EditorState, initialState, isSearchable, reduce } from "../lib/assist-state";
import { newUuid } from "../lib/device";

// 대화·조건·결과 상태와 API 호출을 한 곳에 둔다(component-map 3절). 컴포넌트는 표시만 한다.

// 첫 화면부터 예시 띠를 보이기 위해 데이터 파일로 초기값을 정하고, 이후에는 응답의 example_data를 따른다(R-12)
const BUNDLED_EXAMPLE = vendors.some((v) => v.data_status === "예시");

export function useAssist() {
  const [state, dispatch] = useReducer(reduce, null, () => initialState(BUNDLED_EXAMPLE, getSavedLocation()));
  const [locations, setLocations] = useState<Location[]>([]);
  const ref = useRef(state);
  ref.current = state;
  const retryRef = useRef<(() => void) | null>(null);

  // WF-01 기기 등록(API-06). 이 브라우저에 내 위치가 없으면 서버에 저장된 위치를 쓴다. 실패는 무시한다.
  // 위치 이름 표시용으로 위치 목록(API-14)도 받아 둔다.
  useEffect(() => {
    registerDevice(Dimensions.get("window").width)
      .then((r) => {
        if (!getSavedLocation() && r.location && !r.location.is_default) {
          saveLocation(r.location.location_id);
          dispatch({ type: "set_location", locationId: r.location.location_id });
        }
      })
      .catch(() => {});
    getLocations()
      .then((r) => setLocations(r.locations))
      .catch(() => {});
  }, []);

  const fail = useCallback((e: unknown, retry: () => void) => {
    if (e instanceof NetworkError) {
      retryRef.current = retry;
      dispatch({ type: "network_error" });
    } else if (e instanceof ApiError && e.code === "AI_UNAVAILABLE" && e.detail) {
      dispatch({ type: "ai_failed", message: e.message, detail: e.detail as AiFailureDetail });
    } else if (e instanceof ApiError) {
      dispatch({ type: "input_error", message: e.message });
    } else {
      dispatch({ type: "input_error", message: "잠시 문제가 있어요. 다시 시도해 주세요." });
    }
  }, []);

  const turn = useCallback(
    async (input: Parameters<typeof sendTurn>[1]) => {
      const s = ref.current;
      dispatch({ type: "loading" });
      try {
        const res = await sendTurn({ session_id: s.sessionId, turn_seq: s.turnSeq, condition: s.condition, field_source: s.fieldSource }, input);
        dispatch({ type: "turn_ok", res });
      } catch (e) {
        fail(e, () => void turn(input));
      }
    },
    [fail],
  );

  const sendText = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (text.length < 1 || text.length > 200) {
        dispatch({ type: "input_error", message: "1~200자로 입력해 주세요." });
        return;
      }
      dispatch({ type: "owner_said", text });
      void turn({ type: "text", text });
    },
    [turn],
  );

  const sendChoice = useCallback(
    (slot: AskSlot, option: Option) => {
      dispatch({ type: "owner_said", text: option.label });
      void turn({ type: "choice", slot, value: option.value });
    },
    [turn],
  );

  // WF-08: 칩으로 조건을 고치면 AI 없이 /search(AC-14)
  const editCondition = useCallback(
    async (changes: Partial<PartialCondition>) => {
      const s = ref.current;
      const next = { ...s.condition, ...changes };
      if (!s.sessionId || !isSearchable(next)) {
        dispatch({ type: "input_error", message: "조건을 모두 골라 주세요." });
        return;
      }
      const changed = (Object.keys(changes) as Slot[]).filter((k) => changes[k] !== s.condition[k]);
      dispatch({ type: "loading" });
      try {
        const res = await searchByCondition({
          session_id: s.sessionId,
          condition: { ...next, version: s.version, field_source: s.fieldSource },
          changed,
        });
        dispatch({ type: "search_ok", res });
      } catch (e) {
        fail(e, () => void editCondition(changes));
      }
    },
    [fail],
  );

  // WF-10 요청 남기기(API-05)
  const requestItem = useCallback(async () => {
    const s = ref.current;
    const item = s.notice?.recognized_item;
    if (!item) return;
    dispatch({ type: "request", state: "sending", message: null });
    try {
      const res = await postItemRequest({ requested_text: item.name, matched_item_id: item.item_id, session_id: s.sessionId });
      dispatch({ type: "request", state: "done", message: res.message });
    } catch {
      dispatch({ type: "request", state: "failed", message: "요청을 저장하지 못했어요. 잠시 뒤 다시 눌러 주세요." });
    }
  }, []);

  // v2 사진 진단(API-15): 고르기 → 줄이기 → 보내기. 사진은 저장하지 않는다(R-21)
  const sendPhoto = useCallback(async () => {
    let photo;
    try {
      photo = await pickPhoto();
    } catch (e) {
      dispatch({ type: "input_error", message: e instanceof PhotoError ? e.message : "사진을 열 수 없어요." });
      return;
    }
    if (!photo) return;
    const s = ref.current;
    dispatch({ type: "owner_said", text: "📷 사진을 보냈어요" });
    dispatch({ type: "loading" });
    const send = async () => {
      try {
        const check = await postPhotoCheck({ image: { media_type: photo.media_type, data: photo.data }, session_id: s.sessionId, location_id: s.condition.location_id });
        dispatch({ type: "photo_ok", check });
      } catch (e) {
        fail(e, () => void send());
      }
    };
    await send();
  }, [fail]);

  // v2 시세에 보태기(API-16, 동의)
  const sharePrice = useCallback(async () => {
    const c = ref.current.priceCheck;
    if (!c) return;
    dispatch({ type: "share", state: "sending", message: null });
    try {
      const r = await sharePriceCheck(c.check_id);
      dispatch({ type: "share", state: "done", message: r.shared_lines > 0 ? "보태 주셔서 고마워요. 가게 이름 없이 동네 시세에 반영돼요." : "비교할 수 있는 상추 줄이 없어 보탤 값이 없어요." });
    } catch (e) {
      dispatch({ type: "share", state: "failed", message: e instanceof ApiError ? e.message : "지금은 저장할 수 없어요. 잠시 뒤 다시 눌러 주세요." });
    }
  }, []);

  // WF-07 전화하기 기록(API-04). 전화·안내를 기다리게 하지 않는다(실패해도 무시).
  const recordCall = useCallback((card: VendorCard) => {
    sendEvent({
      client_event_id: newUuid(),
      type: "call_click",
      session_id: ref.current.sessionId,
      vendor_id: card.vendor_id,
      payload: { rank: card.rank, distance_m: card.distance.meters, is_example: card.is_example },
    }).catch(() => {});
  }, []);

  // WF-09 새로 찾기: 세션을 닫는 기록(restart) 후 처음으로
  const restart = useCallback(() => {
    const sid = ref.current.sessionId;
    if (sid) sendEvent({ client_event_id: newUuid(), type: "restart", session_id: sid }).catch(() => {});
    dispatch({ type: "restart" });
  }, []);

  // WF-02 위치 화면에서 돌아왔을 때: 위치가 바뀌었으면 반영하고, 결과가 있으면 같은 조건으로 다시 찾는다(WF-08 경로)
  const applySavedLocation = useCallback(() => {
    const saved = getSavedLocation();
    const s = ref.current;
    if (!saved || saved === s.condition.location_id) return;
    if (s.results) void editCondition({ location_id: saved });
    else dispatch({ type: "set_location", locationId: saved });
  }, [editCondition]);

  const currentLocation = locations.find((l) => l.location_id === state.condition.location_id) ?? locations.find((l) => l.is_default) ?? null;

  return {
    state,
    currentLocation,
    applySavedLocation,
    recordCall,
    restart,
    sendPhoto,
    sharePrice,
    sendText,
    sendChoice,
    editCondition,
    requestItem,
    searchLettuce: useCallback(() => sendText("상추"), [sendText]),
    openEditor: useCallback((editor: EditorState) => dispatch({ type: "open_editor", editor }), []),
    retry: useCallback(() => retryRef.current?.(), []),
  };
}
