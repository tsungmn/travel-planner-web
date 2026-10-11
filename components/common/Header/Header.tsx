"use client";

import { useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  Group,
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  MenuLabel,
  Text,
  UnstyledButton,
  Container,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconChevronDown, IconLogout, IconMapPin } from "@tabler/icons-react";

import { logout } from "@/lib/auth";
import classes from "./Header.module.css";

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  fluid?: boolean;
}

export function Header({
  userName = "",
  userEmail = "",
  fluid = false,
}: HeaderProps) {
  const router = useRouter();
  const initial = userName.charAt(0).toUpperCase() || undefined;
  const hasUser = userName !== "" || userEmail !== "";

  async function handleLogout() {
    try {
      await logout();
      router.push("/login");
    } catch {
      notifications.show({
        color: "red",
        message: "로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  }

  return (
    <Box component="header" className={classes.header}>
      <Container size="lg" className={classes.inner} fluid={fluid}>
        <UnstyledButton
          className={classes.logo}
          onClick={() => router.push("/trips")}
          aria-label="여행길 홈으로 이동"
        >
          <IconMapPin size={24} stroke={2.2} aria-hidden="true" />
          <Text component="span" fw={700} size="lg">
            여행길
          </Text>
        </UnstyledButton>

        <Menu position="bottom-end" withinPortal shadow="md" radius="md">
          <MenuTarget>
            <UnstyledButton
              className={classes.userTrigger}
              aria-label="사용자 메뉴 열기"
            >
              <Avatar color="teal" radius="xl" size={36} fw={600}>
                {initial}
              </Avatar>
              <IconChevronDown size={16} aria-hidden="true" />
            </UnstyledButton>
          </MenuTarget>
          <MenuDropdown w={224}>
            {hasUser && (
              <>
                <MenuLabel>
                  <StackLabel name={userName} email={userEmail} />
                </MenuLabel>
                <MenuDivider />
              </>
            )}
            <MenuItem
              color="red"
              leftSection={<IconLogout size={16} aria-hidden="true" />}
              onClick={handleLogout}
            >
              로그아웃
            </MenuItem>
          </MenuDropdown>
        </Menu>
      </Container>
    </Box>
  );
}

function StackLabel({ name, email }: { name: string; email: string }) {
  return (
    <Group gap={0} className={classes.userLabel}>
      <Text size="sm" fw={600}>
        {name}
      </Text>
      <Text size="xs" fw={400} c="dimmed">
        {email}
      </Text>
    </Group>
  );
}
