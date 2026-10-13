import { SegmentedControl, Text } from "@mantine/core";
import { IconMap2, IconRoute } from "@tabler/icons-react";

import type { TripMode } from "@/types";
import classes from "./ModeSwitch.module.css";

type ModeSwitchProps = {
  mode: TripMode;
  onChange: (mode: TripMode) => void;
};

const OPTIONS: { value: TripMode; label: string; Icon: typeof IconMap2 }[] = [
  { value: "rough", label: "러프", Icon: IconMap2 },
  { value: "plan", label: "계획", Icon: IconRoute },
];

/** 러프(영역으로 큰 그림 잡기) ↔ 계획(장소·항공·숙소). 같은 지도와 데이터를 두고 보이는 것만 바뀝니다. */
export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <SegmentedControl
      fullWidth
      value={mode}
      onChange={(value) => onChange(value as TripMode)}
      aria-label="작업 모드"
      data={OPTIONS.map(({ value, label, Icon }) => ({
        value,
        label: (
          <span className={classes.option}>
            <Icon size={16} aria-hidden="true" />
            <Text span size="sm" fw={500} inherit>
              {label}
            </Text>
          </span>
        ),
      }))}
    />
  );
}
