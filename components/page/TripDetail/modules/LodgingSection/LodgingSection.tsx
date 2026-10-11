import { ActionIcon, Group, Paper, Stack, Text } from "@mantine/core";
import {
  IconArrowRight,
  IconHome,
  IconPencil,
  IconPlus,
} from "@tabler/icons-react";

import type { Lodging } from "@/types";
import { diffDays, formatDateShort } from "@/lib/date";
import { InfoSection } from "../InfoSection";
import classes from "./LodgingSection.module.css";

type LodgingSectionProps = {
  lodgings: Lodging[];
  onAdd: () => void;
  onEdit: (lodging: Lodging) => void;
  /** 카드를 누르면 지도에서 숙소 위치로 이동합니다. */
  onFocus: (lodging: Lodging) => void;
  readOnly?: boolean;
};

export function LodgingSection({
  lodgings,
  onAdd,
  onEdit,
  onFocus,
  readOnly = false,
}: LodgingSectionProps) {
  return (
    <InfoSection
      title="숙소"
      icon={<IconHome size={17} />}
      action={
        !readOnly && (
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="숙소 추가"
            onClick={onAdd}
          >
            <IconPlus size={16} />
          </ActionIcon>
        )
      }
    >
      {lodgings.length === 0 ? (
        <Paper withBorder radius="md" p="md" className={classes.empty}>
          <Text size="xs" c="dimmed" ta="center">
            {readOnly
              ? "등록된 숙소가 없어요."
              : "숙소를 추가하면 지도에서 위치를 확인할 수 있어요"}
          </Text>
        </Paper>
      ) : (
        <Stack gap="xs">
          {lodgings.map((lodging) => (
            <LodgingCard
              key={lodging.id}
              lodging={lodging}
              readOnly={readOnly}
              onFocus={() => onFocus(lodging)}
              onEdit={() => onEdit(lodging)}
            />
          ))}
        </Stack>
      )}
    </InfoSection>
  );
}

function LodgingCard({
  lodging,
  readOnly,
  onFocus,
  onEdit,
}: {
  lodging: Lodging;
  readOnly: boolean;
  onFocus: () => void;
  onEdit: () => void;
}) {
  const nights =
    lodging.check_in && lodging.check_out
      ? Math.max(0, diffDays(lodging.check_in, lodging.check_out))
      : null;

  return (
    <Paper withBorder radius="md" p="sm" className={classes.card}>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <button
          type="button"
          className={classes.focusButton}
          aria-label={`${lodging.name} 위치 보기`}
          onClick={onFocus}
        >
          <Group gap="xs" wrap="nowrap" mb={4}>
            <IconHome size={16} className={classes.icon} aria-hidden="true" />
            <Text size="sm" fw={600} truncate>
              {lodging.name}
            </Text>
          </Group>
          {lodging.address_text && (
            <Text size="xs" c="dimmed" truncate mb={4}>
              {lodging.address_text}
            </Text>
          )}
          {lodging.check_in && lodging.check_out && (
            <Group gap={6} wrap="nowrap" mb={4}>
              <Text size="xs" c="dimmed">
                {formatDateShort(lodging.check_in)}
              </Text>
              <IconArrowRight size={12} aria-hidden="true" />
              <Text size="xs" c="dimmed">
                {formatDateShort(lodging.check_out)}
              </Text>
              {nights !== null && (
                <Text size="xs" c="dimmed">
                  · {nights}박
                </Text>
              )}
            </Group>
          )}
          {lodging.memo && (
            <Text size="xs" c="dimmed" truncate>
              {lodging.memo}
            </Text>
          )}
        </button>
        {!readOnly && (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            aria-label={`${lodging.name} 수정`}
            onClick={onEdit}
          >
            <IconPencil size={15} />
          </ActionIcon>
        )}
      </Group>
    </Paper>
  );
}
