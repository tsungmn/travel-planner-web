import {
  Paper,
  UnstyledButton,
  Group,
  ThemeIcon,
  Collapse,
  Box,
  Text,
} from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { ReactNode, useState } from "react";
import classes from "./InfoSection.module.css";

export function InfoSection({
  title,
  icon,
  action,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: ReactNode;
  /** 제목 줄 오른쪽에 둘 버튼. 접기/펼치기 버튼 바깥에 놓입니다. */
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Paper withBorder radius="md" p="sm">
      <Group gap="xs" wrap="nowrap">
        <UnstyledButton
          className={classes.sectionTrigger}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Group gap="xs">
            <ThemeIcon variant="light" color="teal" size="sm">
              <span>{icon}</span>
            </ThemeIcon>
            <Text fw={600}>{title}</Text>
          </Group>
          <IconChevronDown
            className={open ? classes.chevronOpen : classes.chevron}
            size={18}
            aria-hidden="true"
          />
        </UnstyledButton>
        {action}
      </Group>
      <Collapse expanded={open}>
        <Box pt="sm">{children}</Box>
      </Collapse>
    </Paper>
  );
}
