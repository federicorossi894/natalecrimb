import type { ComponentType } from 'react';
import { template as receipt } from './donor-confirmation';
import { template as gift } from './gift';
export type TemplateEntry<P extends object = Record<string, unknown>> = { component: ComponentType<P>; subject: string; displayName?: string; previewData?: P };
// Disabled preparation only. The managed scaffold replaces the sender/helper after domain setup.
export const TEMPLATES = { 'donor-confirmation': receipt, gift };