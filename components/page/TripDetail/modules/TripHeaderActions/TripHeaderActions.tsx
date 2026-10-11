"use client";

import { useRef, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Drawer,
  Group,
  Indicator,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Modal,
  Popover,
  PopoverDropdown,
  PopoverTarget,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCopy,
  IconDotsVertical,
  IconLink,
  IconPencil,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";

import type { Trip } from "@/types";
import { buildShareUrl } from "@/lib/share";
import { useSiteOrigin } from "@/hooks/useSiteOrigin";
import classes from "./TripHeaderActions.module.css";

type TripHeaderActionsProps = {
  trip: Trip;
  /** 공유를 켭니다. 성공하면 true, 실패하면 false(안내는 호출한 쪽에서 합니다). */
  onShareEnable: () => Promise<boolean>;
  onShareDisable: () => Promise<boolean>;
  onTripDelete: () => void;
  onEditTrip: () => void;
};

export function TripHeaderActions({
  trip,
  onShareEnable,
  onShareDisable,
  onTripDelete,
  onEditTrip,
}: TripHeaderActionsProps) {
  const isMobile = useMediaQuery("(max-width: 47.99em)");
  const origin = useSiteOrigin();
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // 켜기/끄기 요청이 끝나기 전에 또 누르는 것을 막습니다.
  const shareBusy = useRef(false);

  const shareEnabled = trip.share_token !== null;
  const shareUrl =
    trip.share_token && origin ? buildShareUrl(origin, trip.share_token) : "";

  function closeShare() {
    setShareOpen(false);
    setConfirmDisable(false);
  }

  async function runShare(task: () => Promise<boolean>) {
    if (shareBusy.current) return false;
    shareBusy.current = true;
    try {
      return await task();
    } finally {
      shareBusy.current = false;
    }
  }

  async function handleToggle(checked: boolean) {
    if (!checked) {
      setConfirmDisable(true);
      return;
    }
    setConfirmDisable(false);
    await runShare(onShareEnable);
  }

  async function handleConfirmDisable() {
    const done = await runShare(onShareDisable);
    setConfirmDisable(false);
    if (done) notifications.show({ message: "공유를 껐어요.", color: "teal" });
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      notifications.show({ message: "링크를 복사했어요.", color: "teal" });
    } catch {
      notifications.show({
        message: "복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.",
        color: "red",
      });
    }
  }

  function handleDelete() {
    setDeleteOpen(false);
    onTripDelete();
  }

  const shareContent = (
    <ShareContent
      enabled={shareEnabled}
      url={shareUrl}
      confirmDisable={confirmDisable}
      onToggle={handleToggle}
      onCancelDisable={() => setConfirmDisable(false)}
      onConfirmDisable={handleConfirmDisable}
      onCopy={handleCopy}
    />
  );

  const shareButton = (
    <Indicator
      disabled={!shareEnabled}
      size={10}
      offset={3}
      color="teal"
      withBorder
    >
      <Button
        variant="default"
        size="compact-sm"
        leftSection={<IconShare size={16} />}
        className={shareEnabled ? classes.shareOn : undefined}
        onClick={() => setShareOpen((open) => !open)}
      >
        공유
      </Button>
    </Indicator>
  );

  return (
    <>
      <Group gap="xs" wrap="nowrap">
        {isMobile ? (
          <>
            {shareButton}
            <Drawer
              opened={shareOpen}
              onClose={closeShare}
              position="bottom"
              size="auto"
              title="공유"
              radius="md"
            >
              {shareContent}
            </Drawer>
          </>
        ) : (
          <Popover
            opened={shareOpen}
            onChange={(opened) => (opened ? setShareOpen(true) : closeShare())}
            position="bottom-end"
            width={340}
            shadow="md"
          >
            <PopoverTarget>{shareButton}</PopoverTarget>
            <PopoverDropdown>{shareContent}</PopoverDropdown>
          </Popover>
        )}

        <Menu position="bottom-end" withinPortal>
          <MenuTarget>
            <ActionIcon variant="subtle" color="gray" aria-label="여행 메뉴">
              <IconDotsVertical size={18} />
            </ActionIcon>
          </MenuTarget>
          <MenuDropdown>
            <MenuItem
              leftSection={<IconPencil size={16} />}
              onClick={onEditTrip}
            >
              여행 정보 수정
            </MenuItem>
            <MenuItem
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => setDeleteOpen(true)}
            >
              여행 삭제
            </MenuItem>
          </MenuDropdown>
        </Menu>
      </Group>

      <Modal
        opened={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="이 여행을 삭제할까요?"
        centered
        size="sm"
      >
        <Text size="sm" c="dimmed" mb="lg">
          장소, 항공편, 숙소가 모두 사라지고 되돌릴 수 없어요.
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={() => setDeleteOpen(false)}>
            취소
          </Button>
          <Button color="red" onClick={handleDelete}>
            삭제
          </Button>
        </Group>
      </Modal>
    </>
  );
}

function ShareContent({
  enabled,
  url,
  confirmDisable,
  onToggle,
  onCancelDisable,
  onConfirmDisable,
  onCopy,
}: {
  enabled: boolean;
  url: string;
  confirmDisable: boolean;
  onToggle: (checked: boolean) => void;
  onCancelDisable: () => void;
  onConfirmDisable: () => void;
  onCopy: () => void;
}) {
  if (confirmDisable) {
    return (
      <Stack gap="sm">
        <Text size="sm">공유를 끄면 기존 링크는 더 이상 열리지 않아요.</Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={onCancelDisable}>
            취소
          </Button>
          <Button color="red" size="xs" onClick={onConfirmDisable}>
            공유 끄기
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Box>
          <Text size="sm" fw={500}>
            링크로 공유
          </Text>
          <Text size="xs" c="dimmed" mt={2}>
            {enabled
              ? "링크를 아는 누구나 볼 수 있어요. 보는 사람은 수정할 수 없어요."
              : "공유를 켜면 읽기 전용 링크가 만들어져요."}
          </Text>
          {enabled && (
            <Text size="xs" c="dimmed" mt={4}>
              공유를 끄고 다시 켜면 새 링크가 만들어져요.
            </Text>
          )}
        </Box>
        <Switch
          checked={enabled}
          onChange={(event) => onToggle(event.currentTarget.checked)}
          aria-label="링크로 공유"
        />
      </Group>

      {enabled && url && (
        <Group gap="xs" wrap="nowrap">
          <TextInput
            value={url}
            readOnly
            className={classes.url}
            aria-label="공유 링크"
            leftSection={<IconLink size={14} aria-hidden="true" />}
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button
            variant="light"
            size="sm"
            leftSection={<IconCopy size={14} />}
            onClick={onCopy}
          >
            복사
          </Button>
        </Group>
      )}
    </Stack>
  );
}
