import { describe, expect, it } from 'vitest';

import { textToKnowledgeHtml } from './slash-shortcuts';

describe('textToKnowledgeHtml', () => {
  it('将段内连续编号拆成有序列表', () => {
    expect(textToKnowledgeHtml('角色与权限控制： 1. 普通学员； 2. 管理员； 3. 超级管理员。')).toBe(
      '<p>角色与权限控制：</p><ol><li>普通学员</li><li>管理员</li><li>超级管理员。</li></ol>',
    );
  });

  it('保留逐行编号列表解析', () => {
    expect(textToKnowledgeHtml('1. 第一项\n2. 第二项')).toBe(
      '<ol><li>第一项</li><li>第二项</li></ol>',
    );
  });
});
