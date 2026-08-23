import { TaskListItem } from './types';

export type PremiumTaskTemplate = {
  id: string;
  version: 1;
  sourceTaskId?: string;
  createdAt: string;
  title: string;
  category: '仕事' | '家事' | '健康' | '予定' | 'その他';
  priority: '高' | '中' | '低';
  repeatRule: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
  remindAt?: string;
  nudgeMode: 'once' | 'repeat' | 'strong';
  navigationEnabled: boolean;
  preparationMinutes?: number;
  travelMinutes?: number;
  bufferMinutes?: number;
  listItems?: TaskListItem[];
};

export type TaskTemplateSource = Omit<PremiumTaskTemplate, 'id' | 'version' | 'sourceTaskId' | 'createdAt' | 'repeatRule' | 'nudgeMode' | 'navigationEnabled'> & { id?: string; repeatRule?: PremiumTaskTemplate['repeatRule']; nudgeMode?: PremiumTaskTemplate['nudgeMode']; navigationEnabled?: boolean };

export function createPremiumTaskTemplate(source: TaskTemplateSource, id: string, createdAt: Date): PremiumTaskTemplate {
  return {
    id,
    version: 1,
    sourceTaskId: source.id,
    createdAt: createdAt.toISOString(),
    title: source.title,
    category: source.category,
    priority: source.priority,
    repeatRule: source.repeatRule ?? 'none',
    remindAt: source.remindAt,
    nudgeMode: source.nudgeMode ?? 'once',
    navigationEnabled: source.navigationEnabled ?? false,
    preparationMinutes: source.preparationMinutes,
    travelMinutes: source.travelMinutes,
    bufferMinutes: source.bufferMinutes,
    listItems: (source.listItems ?? []).map((item, index) => ({
      id: `${id}:list:${index}:${Math.random().toString(36).slice(2, 8)}`,
      text: item.text,
      checked: false,
      order: index,
    })),
  };
}

export function hasSameTemplateSettings(left: PremiumTaskTemplate, right: PremiumTaskTemplate): boolean {
  return left.title === right.title
    && left.category === right.category
    && left.priority === right.priority
    && left.repeatRule === right.repeatRule
    && left.remindAt === right.remindAt
    && left.nudgeMode === right.nudgeMode
    && left.navigationEnabled === right.navigationEnabled
    && left.preparationMinutes === right.preparationMinutes
    && left.travelMinutes === right.travelMinutes
    && left.bufferMinutes === right.bufferMinutes
    && JSON.stringify((left.listItems ?? []).map((item) => item.text)) === JSON.stringify((right.listItems ?? []).map((item) => item.text));
}

export function summarizePremiumTaskTemplate(template: PremiumTaskTemplate): string {
  const parts = [`${template.category}・優先度 ${template.priority}`];
  if (template.remindAt) parts.push(`通知 ${template.remindAt}`);
  if (template.navigationEnabled) parts.push(`準備${template.preparationMinutes ?? 0} / 移動${template.travelMinutes ?? 0} / 余裕${template.bufferMinutes ?? 0}`);
  if (template.repeatRule !== 'none') parts.push(template.repeatRule === 'daily' ? '毎日' : template.repeatRule === 'weekdays' ? '平日' : template.repeatRule === 'monthly' ? '毎月' : '毎週');
  if (template.listItems?.length) parts.push(`リスト${template.listItems.length}件`);
  return parts.join('　');
}
