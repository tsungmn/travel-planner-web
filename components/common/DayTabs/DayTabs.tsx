import { Box, Tabs, TabsList, TabsTab, Text } from "@mantine/core";

import { formatDayDate } from "@/lib/date";
import { getDayColor } from "@/lib/dayColor";
import classes from "./DayTabs.module.css";

type DayTabsProps = {
  numDays: number;
  startDate: string;
  /** null이면 "전체" 탭 */
  selectedDay: number | null;
  onSelect: (day: number | null) => void;
};

export function DayTabs({
  numDays,
  startDate,
  selectedDay,
  onSelect,
}: DayTabsProps) {
  return (
    <Tabs
      value={selectedDay === null ? "all" : String(selectedDay)}
      onChange={(value) =>
        onSelect(value === "all" || value === null ? null : Number(value))
      }
      variant="pills"
      keepMounted={false}
    >
      <TabsList className={classes.list}>
        <TabsTab value="all">전체</TabsTab>
        {Array.from({ length: numDays }, (_, day) => (
          <TabsTab
            key={day}
            value={String(day)}
            leftSection={
              <Box
                className={classes.dot}
                style={{ background: getDayColor(day).hex }}
              />
            }
          >
            <span className={classes.label}>
              {day + 1}일차
              <Text component="span" size="xs" c="dimmed">
                {formatDayDate(startDate, day)}
              </Text>
            </span>
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}
