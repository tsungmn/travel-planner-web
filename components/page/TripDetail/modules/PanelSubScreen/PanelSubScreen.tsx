"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconTrash } from "@tabler/icons-react";

import classes from "./PanelSubScreen.module.css";

type PanelSubScreenProps = {
  title: string;
  children: ReactNode;
  onBack: () => void;
  /** 저장하지 않은 변경이 있으면 뒤로 갈 때 한 번 더 물어봅니다. */
  dirty?: boolean;
  /** 있으면 하단에 저장 바가 나타납니다. */
  onSave?: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  /** 편집 모드에서 왼쪽에 보이는 삭제 버튼. */
  onDelete?: () => void;
  cancelLabel?: string;
  /** 취소 버튼은 모바일에서만 보입니다. 데스크톱에서도 보려면 켜세요. */
  showCancelOnDesktop?: boolean;
};

export function PanelSubScreen({
  title,
  children,
  onBack,
  dirty = false,
  onSave,
  saving = false,
  saveDisabled = false,
  saveLabel = "저장",
  onDelete,
  cancelLabel = "취소",
  showCancelOnDesktop = false,
}: PanelSubScreenProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);
  const hasFooter = !!onSave;

  // 소프트 키보드가 올라오면 저장 바가 가려지지 않게 키보드 높이만큼 띄웁니다.
  useEffect(() => {
    const viewport = window.visualViewport;
    const footer = footerRef.current;
    if (!viewport || !footer) return;

    const update = () => {
      const offset = window.innerHeight - viewport.height - viewport.offsetTop;
      footer.style.setProperty("--keyboard-offset", `${Math.max(0, offset)}px`);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [hasFooter]);

  function handleBack() {
    if (dirty) setConfirmDiscard(true);
    else onBack();
  }

  function handleDiscard() {
    setConfirmDiscard(false);
    onBack();
  }

  return (
    <Box className={classes.root}>
      <Group gap="xs" wrap="nowrap" className={classes.header}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label="뒤로"
          onClick={handleBack}
        >
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Title order={2} size="h5" lineClamp={1}>
          {title}
        </Title>
      </Group>

      <Box className={classes.body}>{children}</Box>

      {hasFooter && (
        <Box ref={footerRef} className={classes.footer}>
          <Group gap="xs" wrap="nowrap">
            {onDelete && (
              <Button
                variant="subtle"
                color="red"
                size="sm"
                leftSection={<IconTrash size={16} />}
                onClick={onDelete}
              >
                삭제
              </Button>
            )}
            <Box className={classes.spacer} />
            <Button
              variant="default"
              size="sm"
              disabled={saving}
              className={showCancelOnDesktop ? undefined : classes.mobileOnly}
              onClick={handleBack}
            >
              {cancelLabel}
            </Button>
            <Button
              size="sm"
              className={classes.save}
              loading={saving}
              disabled={saveDisabled}
              onClick={onSave}
            >
              {saveLabel}
            </Button>
          </Group>
        </Box>
      )}

      <Modal
        opened={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="변경 사항을 버릴까요?"
        size="xs"
        centered
      >
        <Text size="sm" c="dimmed" mb="lg">
          저장하지 않은 변경 사항이 사라져요.
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={() => setConfirmDiscard(false)}>
            계속 편집
          </Button>
          <Button color="red" onClick={handleDiscard}>
            버리기
          </Button>
        </Group>
      </Modal>
    </Box>
  );
}
