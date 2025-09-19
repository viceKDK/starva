import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { StopTrackingResult } from '@/application/usecases';

export type RootTabParamList = {
  Tracking: undefined;
  History: undefined;
  PersonalRecords: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: { screen?: keyof RootTabParamList };
  RunDetail: { runId: string };
  RunCompletion: { runData: any };
  Achievements: undefined;
  Settings: undefined;
};

export type RootTabScreenProps<Screen extends keyof RootTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, Screen>,
    StackScreenProps<RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
