"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Container,
  Group,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUserX } from "@tabler/icons-react";

import { ApiError } from "@/lib/http";
import { deleteAccount, type DeleteReason } from "@/lib/auth";
import { getUser, type UserInfo } from "@/lib/api";
import { Header } from "@/components/common/Header";
import classes from "./AccountDelete.module.css";

const REASON_OPTIONS: { value: DeleteReason; label: string }[] = [
  { value: "not_useful", label: "원하는 기능이 없어요" },
  { value: "privacy_concern", label: "개인정보가 걱정돼요" },
  { value: "too_difficult", label: "사용하기 어려워요" },
  { value: "found_alternative", label: "다른 서비스를 쓰고 있어요" },
  { value: "other", label: "기타" },
];

export function AccountDeleteClient() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo>({ name: "", email: "" });
  const [reason, setReason] = useState<DeleteReason>("not_useful");
  const [detail, setDetail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getUser()
      .then(setUser)
      .catch(() => undefined);
  }, []);

  const emailMatches =
    emailConfirm.trim().toLowerCase() === user.email.trim().toLowerCase() &&
    user.email !== "";

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount({ reason, detail: detail.trim() || undefined });
      notifications.show({ color: "teal", message: "계정이 삭제되었어요." });
      router.push("/login");
    } catch (error) {
      if (error instanceof ApiError && error.code === "network_error") {
        notifications.show({
          color: "red",
          message: "네트워크에 연결할 수 없어요. 연결을 확인해 주세요.",
        });
      } else {
        notifications.show({
          color: "red",
          message: "계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
        });
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Box className={classes.page}>
      <Header userName={user.name} userEmail={user.email} />

      <Container size="sm" className={classes.main}>
        <Stack gap="xl">
          <Box>
            <Title order={1} size="h2" className={classes.title}>
              계정 삭제
            </Title>
            <Text size="sm" c="dimmed" mt="xs">
              계정을 삭제하면 모든 여행, 장소, 항공편, 숙소가 영구적으로
              사라져요. 되돌릴 수 없어요.
            </Text>
          </Box>

          <Box className={classes.warningBox}>
            <Text size="sm" fw={600}>
              삭제 전 확인해 주세요
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              지금까지 만든 여행 계획이 모두 사라져요. 필요하다면 미리 공유
              링크로 따로 보관해 주세요.
            </Text>
          </Box>

          <Stack gap="md">
            <NativeSelect
              label="계정을 삭제하려는 이유를 알려주세요"
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value as DeleteReason)}
              data={REASON_OPTIONS}
              disabled={deleting}
              classNames={{ input: classes.input, label: classes.label }}
            />

            <Textarea
              label="더 자세히 알려주실 수 있어요 (선택)"
              placeholder="여행길을 개선하는 데 도움이 돼요"
              value={detail}
              onChange={(e) => setDetail(e.currentTarget.value)}
              autosize
              minRows={3}
              maxRows={6}
              disabled={deleting}
              classNames={{ input: classes.input, label: classes.label }}
            />

            <TextInput
              label="삭제하려면 이메일을 입력해 주세요"
              placeholder={user.email || "이메일 입력"}
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.currentTarget.value)}
              disabled={deleting}
              classNames={{ input: classes.input, label: classes.label }}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                radius="xl"
                onClick={() => router.push("/trips")}
                disabled={deleting}
              >
                취소
              </Button>
              <Button
                color="red"
                radius="xl"
                onClick={handleDelete}
                loading={deleting}
                disabled={!emailMatches}
                leftSection={<IconUserX size={16} />}
              >
                계정 삭제
              </Button>
            </Group>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
