import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMember, type Post, type Comment } from "../lib/members";
import type { Store } from "../lib/api-types";
import { CompactStoreCard } from "./CompactStoreCard";
import { AppIcon } from "./AppIcon";
import { color } from "./theme";

const categories = ["전체", "구매처 질문", "가격 제보", "거래 경험"];
function message(e: unknown) {
  return e instanceof Error ? e.message : "잠시 뒤 다시 시도해 주세요.";
}
function Action({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[s.action, secondary && s.secondary, disabled && { opacity: 0.5 }]}
    >
      <Text style={[s.actionText, secondary && s.secondaryText]}>{label}</Text>
    </Pressable>
  );
}
function Notice({ text }: { text: string }) {
  return text ? (
    <Text accessibilityLiveRegion="polite" style={s.notice}>
      {text}
    </Text>
  ) : null;
}
function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <AppIcon name="store" color={color.green} size={30} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.sub}>{body}</Text>
    </View>
  );
}
function useResource<T>(path: string | null) {
  const member = useMember(),
    apiRef = useRef(member.api);
  useEffect(() => { apiRef.current = member.api; }, [member.api]);
  const [tick, setTick] = useState(0),
    [result, setResult] = useState<{
      key: string;
      data: T | null;
      error: string;
    }>();
  const key =
    path && member.profile ? `${member.profile.id}:${path}:${tick}` : "";
  useEffect(() => {
    if (!key || !path) return;
    let active = true;
    void apiRef
      .current<T>(path)
      .then((data) => {
        if (active) setResult({ key, data, error: "" });
      })
      .catch((e) => {
        if (active) setResult({ key, data: null, error: message(e) });
      });
    return () => {
      active = false;
    };
  }, [key, path]);
  return {
    data: result?.key === key ? result.data : null,
    error: result?.key === key ? result.error : "",
    loading: !!key && result?.key !== key,
    refresh: () => setTick((n) => n + 1),
  };
}
export function LoginGate({ children }: { children: React.ReactNode }) {
  const member = useMember(),
    [signup, setSignup] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [passwordVisible, setPasswordVisible] = useState(false),
    [nickname, setNickname] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  if (member.initializing)
    return (
      <Empty title="로그인 확인 중" body="저장된 계정을 확인하고 있어요." />
    );
  if (member.profile) return <>{children}</>;
  const submit = async () => {
    setBusy(true);
    setNotice("");
    try {
      setNotice(
        await member.login(
          email.trim(),
          password,
          signup ? nickname.trim() : undefined,
        ),
      );
    } catch (e) {
      setNotice(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={s.login}>
      <View style={s.emptyIcon}>
        <AppIcon name="user" size={32} color={color.green} />
      </View>
      <Text style={s.title}>
        {signup ? "사장님, 반가워요" : "다시 만나서 반가워요"}
      </Text>
      <Text style={s.sub}>로그인하면 글을 나누고 업체를 저장할 수 있어요.</Text>
      {signup && (
        <TextInput
          accessibilityLabel="닉네임"
          placeholder="닉네임"
          value={nickname}
          onChangeText={setNickname}
          maxLength={30}
          style={s.input}
        />
      )}
      <TextInput
        accessibilityLabel="이메일"
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={s.input}
      />
      <View style={s.passwordRow}>
        <TextInput
          accessibilityLabel="비밀번호"
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
          autoCapitalize="none"
          style={[s.input, s.passwordInput]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? "비밀번호 숨기기" : "비밀번호 표시"}
          onPress={() => setPasswordVisible((visible) => !visible)}
          style={s.passwordToggle}
        >
          <AppIcon name={passwordVisible ? "eyeOff" : "eye"} size={20} color={color.ink} />
        </Pressable>
      </View>
      <Notice text={notice} />
      <Action
        label={busy ? "확인 중…" : signup ? "회원가입" : "로그인"}
        disabled={
          busy ||
          !email.trim() ||
          password.length < 8 ||
          (signup && !nickname.trim())
        }
        onPress={() => void submit()}
      />
      <Action
        secondary
        label="인증 메일 다시 보내기"
        disabled={busy || !email.trim()}
        onPress={() => {
          setBusy(true);
          setNotice("");
          void member.resendConfirmation(email.trim())
            .then(setNotice)
            .catch((e) => setNotice(message(e)))
            .finally(() => setBusy(false));
        }}
      />
      <Action
        secondary
        label={signup ? "이미 계정이 있어요" : "회원가입하기"}
        onPress={() => {
          setSignup(!signup);
          setPasswordVisible(false);
          setNotice("");
        }}
      />
    </ScrollView>
  );
}

function PostCard({
  post,
  onOpen,
  onReact,
}: {
  post: Post;
  onOpen: () => void;
  onReact: (kind: "likes" | "bookmark") => void;
}) {
  return (
    <View style={s.post}>
      <Pressable accessibilityRole="button" onPress={onOpen}>
        <View style={s.row}>
          <Text style={s.category}>{post.category}</Text>
          <Text style={s.muted}>
            {new Date(post.created_at).toLocaleDateString("ko-KR")}
          </Text>
        </View>
        <Text style={s.postTitle}>{post.title}</Text>
        <Text numberOfLines={3} style={s.copy}>
          {post.body}
        </Text>
        <Text style={s.muted}>{post.nickname} · 사용자 제보</Text>
      </Pressable>
      <View style={s.postActions}>
        <Pressable onPress={onOpen}>
          <Text style={s.sub}>댓글 {post.comment_count}</Text>
        </Pressable>
        <Pressable accessibilityLabel="좋아요" onPress={() => onReact("likes")}>
          <Text style={[s.sub, post.liked && s.orange]}>
            ♡ {post.like_count}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="게시글 저장"
          onPress={() => onReact("bookmark")}
          style={s.inline}
        >
          <AppIcon
            name="bookmark"
            size={16}
            color={post.bookmarked ? color.green : color.sub}
          />
          <Text style={[s.sub, post.bookmarked && s.orange]}>
            {post.bookmarked ? "저장됨" : "저장"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function CommunityScreen() {
  return (
    <LoginGate>
      <CommunityContent />
    </LoginGate>
  );
}
function CommunityContent() {
  const member = useMember(),
    [category, setCategory] = useState("전체"),
    [search, setSearch] = useState(""),
    [offset, setOffset] = useState(0),
    [selected, setSelected] = useState<Post | null>(null),
    [editor, setEditor] = useState<{
      id?: string;
      category: string;
      title: string;
      body: string;
    } | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [report, setReport] = useState<string | null>(null),
    [comment, setComment] = useState("");
  const posts = useResource<{ posts: Post[] }>(
    `/community/posts?offset=${offset}${category === "전체" ? "" : `&category=${encodeURIComponent(category)}`}`,
  );
  const detail = useResource<Post>(
    selected ? `/community/posts/${selected.id}` : null,
  );
  const comments = useResource<{ comments: Comment[] }>(
    selected ? `/community/posts/${selected.id}/comments` : null,
  );
  const current = detail.data ?? selected;
  async function mutate(path: string, method: string, body?: unknown) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await member.api(path, method, body);
      posts.refresh();
      detail.refresh();
      comments.refresh();
      return true;
    } catch (e) {
      setNotice(message(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const react = async (post: Post, kind: "likes" | "bookmark") => {
    await mutate(
      `/community/posts/${post.id}/${kind}`,
      (kind === "likes" ? post.liked : post.bookmarked) ? "DELETE" : "PUT",
    );
  };
  if (editor)
    return (
      <ScrollView
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>
          {editor.id ? "게시글 수정" : "사장님 이야기"}
        </Text>
        <Text style={s.sub}>가격과 거래 경험은 사용자 제보로 표시돼요.</Text>
        <View style={s.chips}>
          {categories.slice(1).map((value) => (
            <Pressable
              key={value}
              onPress={() => setEditor({ ...editor, category: value })}
              style={[s.chip, editor.category === value && s.chipOn]}
            >
              <Text style={editor.category === value ? s.onText : s.sub}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          accessibilityLabel="게시글 제목"
          placeholder="제목을 입력해 주세요"
          maxLength={100}
          value={editor.title}
          onChangeText={(title) => setEditor({ ...editor, title })}
          style={s.input}
        />
        <TextInput
          accessibilityLabel="게시글 내용"
          placeholder="사장님의 경험을 나눠 주세요"
          multiline
          maxLength={5000}
          value={editor.body}
          onChangeText={(body) => setEditor({ ...editor, body })}
          style={[s.input, s.textarea]}
        />
        <Notice text={notice} />
        <Action
          label={busy ? "저장 중…" : "게시글 저장"}
          disabled={busy || !editor.title.trim() || !editor.body.trim()}
          onPress={() =>
            void (async () => {
              if (
                await mutate(
                  editor.id
                    ? `/community/posts/${editor.id}`
                    : "/community/posts",
                  editor.id ? "PATCH" : "POST",
                  {
                    category: editor.category,
                    title: editor.title.trim(),
                    body: editor.body.trim(),
                  },
                )
              )
                setEditor(null);
            })()
          }
        />
        <Action
          secondary
          label="취소"
          onPress={() => {
            setEditor(null);
            setNotice("");
          }}
        />
      </ScrollView>
    );
  if (current)
    return (
      <ScrollView
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <Action
          secondary
          label="← 목록으로"
          onPress={() => {
            setSelected(null);
            setNotice("");
            setConfirmDelete(false);
            setReport(null);
          }}
        />
        <Notice text={detail.error || notice} />
        <Text style={s.category}>{current.category}</Text>
        <Text style={s.title}>{current.title}</Text>
        <Text style={s.muted}>
          {current.nickname} ·{" "}
          {new Date(current.created_at).toLocaleString("ko-KR")} · 사용자 제보
        </Text>
        <Text style={s.copy}>{current.body}</Text>
        <View style={s.row}>
          <Action
            secondary
            disabled={busy}
            label={`♡ 좋아요 ${current.like_count}`}
            onPress={() => void react(current, "likes")}
          />
          <Action
            secondary
            disabled={busy}
            label={current.bookmarked ? "저장 해제" : "게시글 저장"}
            onPress={() => void react(current, "bookmark")}
          />
        </View>
        {current.is_mine ? (
          <View style={s.row}>
            <Action
              secondary
              label="수정"
              onPress={() =>
                setEditor({
                  id: current.id,
                  category: current.category,
                  title: current.title,
                  body: current.body,
                })
              }
            />
            <Action
              secondary
              label="삭제"
              onPress={() => setConfirmDelete(true)}
            />
          </View>
        ) : (
          <Action secondary label="이 글 신고" onPress={() => setReport("")} />
        )}
        {confirmDelete && (
          <View style={s.panel}>
            <Text style={s.copy}>
              이 글을 삭제 처리할까요? 목록에서 숨겨집니다.
            </Text>
            <Action
              label="삭제 확인"
              disabled={busy}
              onPress={() =>
                void (async () => {
                  if (
                    await mutate(`/community/posts/${current.id}`, "DELETE")
                  ) {
                    setSelected(null);
                    setConfirmDelete(false);
                  }
                })()
              }
            />
          </View>
        )}
        {report !== null && (
          <View style={s.panel}>
            <TextInput
              accessibilityLabel="신고 사유"
              placeholder="신고 사유를 적어 주세요"
              value={report}
              onChangeText={setReport}
              maxLength={1000}
              style={s.input}
            />
            <Action
              label="신고 접수"
              disabled={busy || !report.trim()}
              onPress={() =>
                void (async () => {
                  if (
                    await mutate("/community/reports", "POST", {
                      post_id: current.id,
                      reason: report.trim(),
                    })
                  ) {
                    setReport(null);
                    setNotice("신고를 접수했어요. 운영자가 검토합니다.");
                  }
                })()
              }
            />
          </View>
        )}
        <Text style={s.postTitle}>댓글 {current.comment_count}</Text>
        <Notice text={comments.error} />
        {comments.data?.comments.map((item) => (
          <View key={item.id} style={s.comment}>
            <View style={s.row}>
              <Text style={s.postTitle}>{item.nickname}</Text>
              {item.is_mine && (
                <Pressable
                  disabled={busy}
                  onPress={() =>
                    void mutate(`/community/comments/${item.id}`, "DELETE")
                  }
                >
                  <Text style={s.muted}>삭제</Text>
                </Pressable>
              )}
            </View>
            <Text style={s.copy}>{item.body}</Text>
          </View>
        ))}
        <TextInput
          accessibilityLabel="댓글 내용"
          placeholder="댓글을 남겨 주세요"
          value={comment}
          onChangeText={setComment}
          maxLength={1000}
          style={s.input}
        />
        <Action
          label="댓글 등록"
          disabled={busy || !comment.trim()}
          onPress={() =>
            void (async () => {
              if (
                await mutate(
                  `/community/posts/${current.id}/comments`,
                  "POST",
                  { body: comment.trim() },
                )
              )
                setComment("");
            })()
          }
        />
      </ScrollView>
    );
  return (
    <View style={s.flex}>
      <View style={s.filters}>
        <View style={s.chips}>
          {categories.map((value) => (
            <Pressable
              key={value}
              onPress={() => {
                setCategory(value);
                setOffset(0);
              }}
              style={[s.chip, category === value && s.chipOn]}
            >
              <Text style={category === value ? s.onText : s.sub}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          accessibilityLabel="게시글 검색"
          placeholder="이 페이지에서 이야기 검색"
          value={search}
          onChangeText={setSearch}
          style={s.input}
        />
      </View>
      <ScrollView contentContainerStyle={s.feed}>
        <Notice text={notice || posts.error} />
        {posts.loading && <Text style={s.sub}>이야기를 불러오고 있어요…</Text>}
        {posts.error && (
          <Action secondary label="다시 불러오기" onPress={posts.refresh} />
        )}
        {posts.data?.posts
          .filter((p) => `${p.title} ${p.body}`.includes(search))
          .map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpen={() => setSelected(post)}
              onReact={(kind) => {
                if (!busy) void react(post, kind);
              }}
            />
          ))}
        {posts.data?.posts.length === 0 && (
          <Empty
            title="첫 이야기를 들려주세요"
            body="구매처 질문과 거래 경험을 나눠 보세요."
          />
        )}
        <View style={s.row}>
          <Action
            secondary
            label="이전"
            disabled={offset === 0 || posts.loading}
            onPress={() => setOffset((n) => Math.max(0, n - 20))}
          />
          <Action
            secondary
            label="다음"
            disabled={posts.loading || (posts.data?.posts.length ?? 0) < 20}
            onPress={() => setOffset((n) => n + 20)}
          />
        </View>
      </ScrollView>
      <Pressable
        accessibilityLabel="글쓰기"
        style={s.fab}
        onPress={() => {
          setNotice("");
          setEditor({ category: "구매처 질문", title: "", body: "" });
        }}
      >
        <AppIcon name="edit" size={18} color="#ffffff" />
        <Text style={s.actionText}>글쓰기</Text>
      </Pressable>
    </View>
  );
}

type Saved = { vendor_id: string; saved_at: string; store: Store | null };
export function SavedScreen() {
  return (
    <LoginGate>
      <SavedContent />
    </LoginGate>
  );
}
function SavedContent() {
  const member = useMember(),
    [tab, setTab] = useState("업체"),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const saved = useResource<{ vendors: Saved[] }>("/me/saved-vendors"),
    posts = useResource<{ posts: Post[] }>("/community/posts?saved=true");
  const resource = tab === "업체" ? saved : posts;
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.chips}>
        {["업체", "게시글"].map((value) => (
          <Pressable
            key={value}
            onPress={() => setTab(value)}
            style={[s.chip, tab === value && s.chipOn]}
          >
            <Text style={tab === value ? s.onText : s.sub}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.title}>저장한 {tab}</Text>
      <Notice text={notice || resource.error} />
      {resource.loading && (
        <Text style={s.sub}>저장한 항목을 불러오는 중…</Text>
      )}
      <Action secondary label="새로고침" onPress={resource.refresh} />
      {tab === "업체"
        ? saved.data?.vendors.map((item) => (
            <View key={item.vendor_id}>
              {item.store ? (
                <CompactStoreCard store={item.store} />
              ) : (
                <Text style={s.copy}>
                  현재 공개 정보를 확인할 수 없는 업체예요.
                </Text>
              )}
              <Action
                secondary
                disabled={busy}
                label="저장 해제"
                onPress={() =>
                  void (async () => {
                    setBusy(true);
                    try {
                      await member.api(
                        `/me/saved-vendors/${encodeURIComponent(item.vendor_id)}`,
                        "DELETE",
                      );
                      saved.refresh();
                    } catch (e) {
                      setNotice(message(e));
                    } finally {
                      setBusy(false);
                    }
                  })()
                }
              />
            </View>
          ))
        : posts.data?.posts.map((post) => (
            <View key={post.id} style={s.post}>
              <Text style={s.category}>{post.category}</Text>
              <Text style={s.postTitle}>{post.title}</Text>
              <Text style={s.copy}>{post.body}</Text>
              <Action
                secondary
                disabled={busy}
                label="저장 해제"
                onPress={() =>
                  void (async () => {
                    setBusy(true);
                    try {
                      await member.api(
                        `/community/posts/${post.id}/bookmark`,
                        "DELETE",
                      );
                      posts.refresh();
                    } catch (e) {
                      setNotice(message(e));
                    } finally {
                      setBusy(false);
                    }
                  })()
                }
              />
            </View>
          ))}
      {(tab === "업체"
        ? saved.data?.vendors.length === 0
        : posts.data?.posts.length === 0) && (
        <Empty
          title="아직 저장한 항목이 없어요"
          body="다시 보고 싶은 업체와 게시글을 저장해 보세요."
        />
      )}
    </ScrollView>
  );
}
export function ProfileScreen({
  onSaved,
  onLocation,
  location,
}: {
  onSaved: () => void;
  onLocation: () => void;
  location: string;
}) {
  return (
    <LoginGate>
      <ProfileContent
        onSaved={onSaved}
        onLocation={onLocation}
        location={location}
      />
    </LoginGate>
  );
}
function ProfileContent({
  onSaved,
  onLocation,
  location,
}: {
  onSaved: () => void;
  onLocation: () => void;
  location: string;
}) {
  const member = useMember(),
    [editing, setEditing] = useState(false),
    [nickname, setNickname] = useState(member.profile?.nickname ?? ""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    setNotice("");
    try {
      await member.logout();
    } catch (error) {
      setNotice(message(error));
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.panel}>
        <View style={s.inline}>
          <View style={s.emptyIcon}>
            <AppIcon name="store" color={color.green} size={28} />
          </View>
          <View>
            <Text style={s.title}>{member.profile?.nickname}</Text>
            <Text style={s.sub}>{member.profile?.email}</Text>
            <Text style={s.muted}>
              {member.profile?.email_confirmed
                ? "이메일 인증됨"
                : "이메일 인증 확인 필요"}
            </Text>
          </View>
        </View>
        <Notice text={notice} />
        <Action
          secondary
          label={loggingOut ? "로그아웃 중…" : "로그아웃"}
          disabled={loggingOut || busy}
          onPress={() => void logout()}
        />
        {editing ? (
          <>
            <TextInput
              accessibilityLabel="새 닉네임"
              value={nickname}
              onChangeText={setNickname}
              maxLength={30}
              style={s.input}
            />
            <Action
              label="닉네임 저장"
              disabled={busy || !nickname.trim()}
              onPress={() =>
                void (async () => {
                  setBusy(true);
                  try {
                    await member.api("/me/profile", "PATCH", {
                      nickname: nickname.trim(),
                    });
                    await member.refreshProfile();
                    setEditing(false);
                  } catch (e) {
                    setNotice(message(e));
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            />
          </>
        ) : (
          <Action
            secondary
            label="닉네임 수정"
            onPress={() => setEditing(true)}
          />
        )}
      </View>
      <View style={s.panel}>
        <Menu label="내 가게 기준 위치" value={location} onPress={onLocation} />
        <Menu label="저장한 항목" onPress={onSaved} />
        <Menu
          label="계정 정보 새로고침"
          onPress={() =>
            void member.refreshProfile().catch((e) => setNotice(message(e)))
          }
        />
      </View>
      <Text style={s.sub}>
        사업자 인증 여부와 로그인 계정은 별개입니다. 이 앱에서 주문·결제는
        제공하지 않아요.
      </Text>
    </ScrollView>
  );
}
function Menu({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.menu}>
      <View>
        <Text style={s.copy}>{label}</Text>
        {value && <Text style={s.muted}>{value}</Text>}
      </View>
      <AppIcon name="chevron" size={17} color={color.sub} />
    </Pressable>
  );
}
const s = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: 18, paddingBottom: 32, gap: 14 },
  login: { padding: 24, paddingTop: 45, gap: 14 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: color.ink,
    letterSpacing: -0.5,
  },
  sub: { fontSize: 13, color: color.sub, lineHeight: 20 },
  muted: { fontSize: 11, color: color.sub, lineHeight: 17 },
  copy: { fontSize: 14, color: color.ink, lineHeight: 23 },
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 52 },
  passwordToggle: { position: "absolute", right: 2, top: 0, bottom: 0, width: 44, justifyContent: "center", alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: color.ink,
    backgroundColor: color.surface,
  },
  textarea: { minHeight: 180, textAlignVertical: "top" },
  action: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.green,
  },
  actionText: { fontSize: 13, fontWeight: "600", color: "#ffffff" },
  secondary: { backgroundColor: color.soft },
  secondaryText: { color: color.ink },
  notice: {
    fontSize: 12,
    color: color.amber,
    backgroundColor: color.amberSoft,
    padding: 12,
    borderRadius: 12,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: 10 },
  chips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: color.soft,
  },
  chipOn: { backgroundColor: color.green },
  onText: { color: "#ffffff", fontSize: 13 },
  orange: { color: color.green },
  filters: { paddingHorizontal: 18, paddingBottom: 10, gap: 12 },
  feed: { paddingHorizontal: 18, paddingBottom: 90 },
  post: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
    gap: 8,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: color.ink,
    marginVertical: 5,
  },
  category: { fontSize: 11, color: color.green, fontWeight: "600" },
  postActions: { flexDirection: "row", gap: 20, marginTop: 8 },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    borderRadius: 26,
    padding: 16,
    backgroundColor: color.green,
    flexDirection: "row",
    gap: 8,
    shadowColor: color.green,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  empty: { paddingVertical: 45, alignItems: "center", gap: 12 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: color.greenSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: color.ink },
  panel: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.line,
    gap: 14,
  },
  comment: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  menu: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
});
