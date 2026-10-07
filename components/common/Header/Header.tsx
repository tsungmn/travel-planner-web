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
} from "@mantine/core";
import { IconChevronDown, IconLogout, IconMapPin } from "@tabler/icons-react";

import { mockUser } from "@/mocks/data";
import classes from "./Header.module.css";

export function Header() {
  const router = useRouter();
  const initial = mockUser.name.charAt(0).toUpperCase();

  return (
    <Box component="header" className={classes.header}>
      <Box className={classes.inner}>
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
            <MenuLabel>
              <StackLabel name={mockUser.name} email={mockUser.email} />
            </MenuLabel>
            <MenuDivider />
            <MenuItem
              color="red"
              leftSection={<IconLogout size={16} aria-hidden="true" />}
              onClick={() => router.push("/login")}
            >
              로그아웃
            </MenuItem>
          </MenuDropdown>
        </Menu>
      </Box>
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
