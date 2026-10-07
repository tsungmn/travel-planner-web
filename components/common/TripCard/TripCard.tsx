"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDotsVertical,
  IconLink,
  IconMapPin,
  IconTrash,
} from "@tabler/icons-react";

import type { Trip } from "@/types";
import classes from "./TripCard.module.css";
import { formatPeriod } from "@/lib/date";

type TripCardProps = {
  trip: Trip;
  past?: boolean;
};

const COVER_GRADIENTS: Record<string, string> = {
  칭다오: "linear-gradient(135deg, #99f6e4 0%, #5eead4 50%, #14b8a6 100%)",
  오사카: "linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #f97316 100%)",
  도쿄: "linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 50%, #ec4899 100%)",
  제주: "linear-gradient(135deg, #bae6fd 0%, #7dd3fc 50%, #0ea5e9 100%)",
};

function getGradient(destination: string): string {
  return (
    COVER_GRADIENTS[destination] ??
    "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 50%, #5eead4 100%)"
  );
}

export function TripCard({ trip, past = false }: TripCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function openTrip() {
    router.push(`/trips/${trip.id}`);
  }

  function handleDelete() {
    setDeleteOpen(false);
    notifications.show({
      message: "여행을 삭제했어요.",
      color: "teal",
    });
  }

  return (
    <>
      <Card
        className={`${classes.card} ${past ? classes.past : ""}`}
        padding={0}
        radius="xl"
        withBorder
        shadow="sm"
        onClick={openTrip}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openTrip();
          }
        }}
        role="link"
        tabIndex={0}
      >
        <Box
          className={classes.cover}
          style={{ background: getGradient(trip.destination) }}
        >
          <Text className={classes.destination} component="span" fw={700}>
            {trip.destination}
          </Text>

          <Box
            className={classes.menu}
            onClick={(event) => event.stopPropagation()}
          >
            <Menu position="bottom-end" withinPortal shadow="md" radius="md">
              <Menu.Target>
                <ActionIcon
                  variant="default"
                  color="white"
                  className={classes.menuButton}
                  aria-label="여행 메뉴 열기"
                  onClick={(event) => event.stopPropagation()}
                >
                  <IconDotsVertical size={18} aria-hidden="true" />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} aria-hidden="true" />}
                  onClick={() => setDeleteOpen(true)}
                >
                  삭제
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Box>
        </Box>

        <Stack gap="xs" p="md">
          <Text fw={600} truncate>
            {trip.title}
          </Text>
          <Text size="sm" c="dimmed">
            {trip.destination}
          </Text>
          <Text size="sm" c="dimmed">
            {formatPeriod(trip.start_date, trip.end_date)}
          </Text>

          <Group gap="xs" pt={4}>
            <Badge
              variant="light"
              color="gray"
              leftSection={<IconMapPin size={13} aria-hidden="true" />}
            >
              {trip.stop_count > 0 ? `장소 ${trip.stop_count}곳` : "장소 없음"}
            </Badge>
            {trip.share_token && (
              <Badge
                variant="light"
                color="teal"
                leftSection={<IconLink size={13} aria-hidden="true" />}
              >
                공유 중
              </Badge>
            )}
          </Group>
        </Stack>
      </Card>

      <Modal
        opened={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        centered
        radius="xl"
        title={`‘${trip.title}’을 삭제할까요?`}
      >
        <Text size="sm" c="dimmed">
          장소, 항공편, 숙소가 모두 사라지고 되돌릴 수 없어요.
        </Text>
        <Group justify="flex-end" mt="xl">
          <Button
            variant="default"
            radius="xl"
            onClick={() => setDeleteOpen(false)}
          >
            취소
          </Button>
          <Button
            color="red"
            radius="xl"
            onClick={handleDelete}
            leftSection={<IconTrash size={16} />}
          >
            삭제
          </Button>
        </Group>
      </Modal>
    </>
  );
}
