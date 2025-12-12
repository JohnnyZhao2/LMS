"""
Script to create a test Excel file for question import.
Run this script to generate test_questions.xlsx
"""
import json
from openpyxl import Workbook

def create_test_excel():
    """Create a test Excel file with sample questions."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Questions"
    
    # Header row
    ws.append([
        '题目类型',
        '题目内容',
        '选项',
        '正确答案',
        '题目解析',
        '难度',
        '是否公开'
    ])
    
    # Sample questions
    questions = [
        # Single choice question
        [
            'SINGLE',
            'Python是什么类型的编程语言？',
            json.dumps({"A": "编译型", "B": "解释型", "C": "汇编语言", "D": "机器语言"}, ensure_ascii=False),
            json.dumps({"answer": "B"}, ensure_ascii=False),
            'Python是一种解释型、面向对象的高级编程语言',
            2,
            True
        ],
        # Multiple choice question
        [
            'MULTIPLE',
            '以下哪些是Python的特点？',
            json.dumps({"A": "简单易学", "B": "开源免费", "C": "跨平台", "D": "只能用于Web开发"}, ensure_ascii=False),
            json.dumps({"answer": ["A", "B", "C"]}, ensure_ascii=False),
            'Python具有简单易学、开源免费、跨平台等特点，可用于多种开发场景',
            3,
            True
        ],
        # Judge question
        [
            'JUDGE',
            'Python支持面向对象编程',
            json.dumps({"A": "正确", "B": "错误"}, ensure_ascii=False),
            json.dumps({"answer": True}, ensure_ascii=False),
            'Python完全支持面向对象编程，包括类、继承、多态等特性',
            1,
            True
        ],
        # Essay question
        [
            'ESSAY',
            '请简述Python的主要应用领域',
            None,
            json.dumps({"answer": "参考答案：Web开发、数据分析、人工智能、自动化运维等"}, ensure_ascii=False),
            'Python广泛应用于Web开发、数据科学、机器学习、自动化等领域',
            4,
            False
        ],
    ]
    
    for question in questions:
        ws.append(question)
    
    # Save the file
    filename = 'test_questions.xlsx'
    wb.save(filename)
    print(f'Test Excel file created: {filename}')
    
    return filename

if __name__ == '__main__':
    create_test_excel()
