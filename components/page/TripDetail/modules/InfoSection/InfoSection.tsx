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
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Paper withBorder radius="md" p="sm">
      <UnstyledButton
        className={classes.sectionTrigger}
        onClick={() => setOpen((value) => !value)}
      >
        <Group gap="xs">
          <ThemeIcon variant="light" color="teal" size="sm">
            <span>{icon}</span>
          </ThemeIcon>
          <Text fw={600}>{title}</Text>
        </Group>
        <IconChevronDown
          className={open ? classes.chevronOpen : ""}
          size={18}
        />
      </UnstyledButton>
      <Collapse expanded={open}>
        <Box pt="sm">{children}</Box>
      </Collapse>
    </Paper>
  );
}
