"use client";

import { useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Divider,
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
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCopy,
  IconDotsVertical,
  IconLink,
  IconPencil,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";

import type { ShareOptions, Trip } from "@/types";
import { buildShareUrl } from "@/lib/share";
import { useSiteOrigin } from "@/hooks/useSiteOrigin";
import classes from "./TripHeaderActions.module.css";

const SHARE_OPTION_LABELS: { key: keyof ShareOptions; label: string }[] = [
  { key: "flights", label: "항공편 공개" },
  { key: "lodgings", label: "숙소 공개" },
  { key: "memos", label: "메모 공개" },
];

type TripHeaderActionsProps = {
  trip: Trip;
  /** 공유를 켭니다. 성공하면 true, 실패하면 false(안내는 호출한 쪽에서 합니다). */
  onShareEnable: () => Promise<boolean>;
  /** 공개 항목(항공편/숙소/메모) 하나를 켜거나 끕니다. */
  onShareOptionChange: (options: Partial<ShareOptions>) => Promise<boolean>;
  onShareDisable: () => Promise<boolean>;
  onTripDelete: () => void;
  onEditTrip: () => void;
};

export function TripHeaderActions({
  trip,
  onShareEnable,
  onShareOptionChange,
  onShareDisable,
  onTripDelete,
  onEditTrip,
}: TripHeaderActionsProps) {
  const isMobile = useMediaQuery("(max-width: 47.99em)");
  const isCompact = useMediaQuery("(max-width: 22rem)");
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

  async function handleOption(key: keyof ShareOptions, checked: boolean) {
    await runShare(() => onShareOptionChange({ [key]: checked }));
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
      options={{
        flights: trip.share_flights,
        lodgings: trip.share_lodgings,
        memos: trip.share_memos,
      }}
      confirmDisable={confirmDisable}
      onToggle={handleToggle}
      onOptionChange={handleOption}
      onCancelDisable={() => setConfirmDisable(false)}
      onConfirmDisable={handleConfirmDisable}
      onCopy={handleCopy}
    />
  );

  const shareButton = (
    <Indicator
      disabled={!shareEnabled}
      size={9}
      offset={4}
      color="teal"
      withBorder
      processing={shareEnabled}
    >
      <Button
        variant={shareEnabled ? "light" : "default"}
        color={shareEnabled ? "teal" : "gray"}
        size="compact-sm"
        leftSection={<IconShare size={16} />}
        className={`${classes.shareButton} ${
          shareEnabled ? classes.shareOn : ""
        }`}
        onClick={() => setShareOpen((open) => !open)}
        aria-label="공유"
      >
        {isCompact ? null : "공유"}
      </Button>
    </Indicator>
  );

  return (
    <>
      <Group gap="xs" wrap="nowrap" className={classes.actions}>
        {isMobile ? (
          <>
            {shareButton}
            <Drawer
              opened={shareOpen}
              onClose={closeShare}
              position="bottom"
              size="auto"
              title={
                <Text size="md" fw={600}>
                  공유
                </Text>
              }
              radius="md"
              styles={{
                content: { paddingBottom: "env(safe-area-inset-bottom)" },
              }}
            >
              <Box className={classes.drawerBody}>{shareContent}</Box>
            </Drawer>
          </>
        ) : (
          <Popover
            opened={shareOpen}
            onChange={(opened) => (opened ? setShareOpen(true) : closeShare())}
            position="bottom-end"
            width={360}
            shadow="md"
            radius="md"
          >
            <PopoverTarget>{shareButton}</PopoverTarget>
            <PopoverDropdown>{shareContent}</PopoverDropdown>
          </Popover>
        )}

        <Menu position="bottom-end" withinPortal shadow="md" radius="md">
          <MenuTarget>
            <Tooltip label="더 보기" position="bottom" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="여행 메뉴"
                className={classes.menuIcon}
              >
                <IconDotsVertical size={18} />
              </ActionIcon>
            </Tooltip>
          </MenuTarget>
          <MenuDropdown>
            <MenuItem
              leftSection={<IconPencil size={16} />}
              onClick={onEditTrip}
            >
              여행 정보 수정
            </MenuItem>
            <Divider label="위험 구역" labelPosition="center" fs="italic" />
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
        title={
          <Group gap="xs">
            <IconAlertTriangle size={18} color="var(--mantine-color-red-6)" />
            <Text fw={600}>이 여행을 삭제할까요?</Text>
          </Group>
        }
        centered
        size="sm"
        radius="md"
      >
        <Text size="sm" c="dimmed" mb="lg">
          장소, 항공편, 숙소가 모두 사라지고 되돌릴 수 없어요.
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={() => setDeleteOpen(false)}>
            취소
          </Button>
          <Button
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={handleDelete}
          >
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
  options,
  confirmDisable,
  onToggle,
  onOptionChange,
  onCancelDisable,
  onConfirmDisable,
  onCopy,
}: {
  enabled: boolean;
  url: string;
  options: ShareOptions;
  confirmDisable: boolean;
  onToggle: (checked: boolean) => void;
  onOptionChange: (key: keyof ShareOptions, checked: boolean) => void;
  onCancelDisable: () => void;
  onConfirmDisable: () => void;
  onCopy: () => void;
}) {
  if (confirmDisable) {
    return (
      <Stack gap="md">
        <Alert
          icon={<IconAlertTriangle size={18} />}
          color="red"
          variant="light"
          radius="md"
        >
          공유를 끄면 기존 링크는 더 이상 열리지 않아요.
        </Alert>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="sm" onClick={onCancelDisable}>
            취소
          </Button>
          <Button
            color="red"
            size="sm"
            leftSection={<IconTrash size={16} />}
            onClick={onConfirmDisable}
          >
            공유 끄기
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Box className={classes.section}>
          <Text size="sm" fw={600}>
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
          color="teal"
          size="md"
        />
      </Group>

      {enabled && (
        <>
          <Divider className={classes.divider} />
          <Stack gap={6} className={classes.section}>
            <Text size="xs" fw={500} c="dimmed">
              공개 항목
            </Text>
            <Text size="xs" c="dimmed">
              장소와 영역은 항상 공개돼요. 아래 항목은 켠 것만 보여요.
            </Text>
            <Stack gap={10} className={classes.optionsStack} mt={4}>
              {SHARE_OPTION_LABELS.map(({ key, label }) => (
                <Group
                  key={key}
                  justify="space-between"
                  wrap="nowrap"
                  className={classes.optionRow}
                >
                  <Text size="sm">{label}</Text>
                  <Switch
                    size="sm"
                    color="teal"
                    checked={options[key]}
                    onChange={(event) =>
                      onOptionChange(key, event.currentTarget.checked)
                    }
                    aria-label={label}
                  />
                </Group>
              ))}
            </Stack>
          </Stack>
        </>
      )}

      {enabled && url && (
        <>
          <Divider className={classes.divider} />
          <Group gap="xs" wrap="nowrap" className={classes.urlRow}>
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
              color="teal"
              size="sm"
              leftSection={<IconCopy size={14} />}
              onClick={onCopy}
            >
              복사
            </Button>
          </Group>
        </>
      )}
    </Stack>
  );
}
