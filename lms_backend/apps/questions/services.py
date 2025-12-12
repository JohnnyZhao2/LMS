"""
Service layer for questions app.
Handles business logic for question import and other operations.
"""
import json
from typing import Dict, List, Tuple
from openpyxl import load_workbook
from django.db import transaction
from .models import Question


class QuestionImportService:
    """
    Service for importing questions from Excel files.
    
    Expected Excel format:
    - Column A: 题目类型 (SINGLE/MULTIPLE/JUDGE/ESSAY)
    - Column B: 题目内容
    - Column C: 选项 (JSON格式)
    - Column D: 正确答案 (JSON格式)
    - Column E: 题目解析
    - Column F: 难度 (1-5)
    - Column G: 是否公开 (TRUE/FALSE)
    """
    
    VALID_TYPES = ['SINGLE', 'MULTIPLE', 'JUDGE', 'ESSAY']
    
    def __init__(self, user):
        self.user = user
        self.success_count = 0
        self.error_records = []

    def parse_excel_file(self, file) -> List[Dict]:
        """Parse Excel file and extract question data."""
        try:
            workbook = load_workbook(file, read_only=True)
            sheet = workbook.active
            
            questions_data = []
            
            # Skip header row, start from row 2
            for row_num, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
                if not any(row):
                    continue
                
                try:
                    question_data = self._parse_row(row, row_num)
                    if question_data:
                        questions_data.append(question_data)
                except Exception as e:
                    self.error_records.append({
                        'row': row_num,
                        'error': str(e)
                    })
            
            workbook.close()
            return questions_data
            
        except Exception as e:
            raise ValueError(f'Excel文件解析失败: {str(e)}')

    def _parse_row(self, row: Tuple, row_num: int) -> Dict:
        """Parse a single row from Excel."""
        # Extract values
        question_type = str(row[0]).strip().upper() if row[0] else None
        content = str(row[1]).strip() if row[1] else None
        options_str = str(row[2]).strip() if row[2] else None
        answer_str = str(row[3]).strip() if row[3] else None
        analysis = str(row[4]).strip() if row[4] and row[4] != 'None' else None
        difficulty = row[5] if row[5] else 3
        is_public = row[6] if row[6] is not None else False
        
        # Validate required fields
        if not question_type:
            raise ValueError(f'第{row_num}行: 题目类型不能为空')
        
        if question_type not in self.VALID_TYPES:
            raise ValueError(f'第{row_num}行: 题目类型必须是 {", ".join(self.VALID_TYPES)} 之一')
        
        if not content:
            raise ValueError(f'第{row_num}行: 题目内容不能为空')
        
        if not answer_str:
            raise ValueError(f'第{row_num}行: 正确答案不能为空')
        
        # Parse options
        options = None
        if question_type in ['SINGLE', 'MULTIPLE', 'JUDGE']:
            if not options_str or options_str == 'None':
                raise ValueError(f'第{row_num}行: {question_type}题必须提供选项')
            
            try:
                options = json.loads(options_str)
                if not isinstance(options, dict):
                    raise ValueError('选项必须是JSON对象格式')
            except json.JSONDecodeError:
                raise ValueError(f'第{row_num}行: 选项格式错误，必须是有效的JSON')
        
        # Parse correct answer
        try:
            correct_answer = json.loads(answer_str)
            if not isinstance(correct_answer, dict) or 'answer' not in correct_answer:
                raise ValueError('答案格式错误')
        except json.JSONDecodeError:
            raise ValueError(f'第{row_num}行: 答案格式错误，必须是有效的JSON')
        
        # Validate answer format
        answer_value = correct_answer.get('answer')
        if question_type == 'SINGLE':
            if not isinstance(answer_value, str):
                raise ValueError(f'第{row_num}行: 单选题答案必须是字符串')
        elif question_type == 'MULTIPLE':
            if not isinstance(answer_value, list):
                raise ValueError(f'第{row_num}行: 多选题答案必须是列表')
        elif question_type == 'JUDGE':
            if not isinstance(answer_value, bool):
                raise ValueError(f'第{row_num}行: 判断题答案必须是布尔值')
        
        # Validate difficulty
        try:
            difficulty = int(difficulty)
            if difficulty < 1 or difficulty > 5:
                raise ValueError(f'第{row_num}行: 难度必须在1-5之间')
        except (ValueError, TypeError):
            raise ValueError(f'第{row_num}行: 难度必须是1-5之间的整数')
        
        # Parse is_public
        if isinstance(is_public, str):
            is_public = is_public.upper() in ['TRUE', 'YES', '1', 'Y']
        elif not isinstance(is_public, bool):
            is_public = bool(is_public)
        
        return {
            'type': question_type,
            'content': content,
            'options': options,
            'correct_answer': correct_answer,
            'analysis': analysis,
            'difficulty': difficulty,
            'is_public': is_public,
        }

    @transaction.atomic
    def import_questions(self, questions_data: List[Dict]) -> Dict:
        """Import questions into database."""
        self.success_count = 0
        
        for question_data in questions_data:
            try:
                Question.objects.create(
                    **question_data,
                    created_by=self.user
                )
                self.success_count += 1
            except Exception as e:
                self.error_records.append({
                    'content': question_data.get('content', '')[:50],
                    'error': str(e)
                })
        
        return {
            'success_count': self.success_count,
            'error_count': len(self.error_records),
            'error_records': self.error_records
        }
    
    def process_import(self, file) -> Dict:
        """Process the complete import workflow."""
        # Reset counters
        self.success_count = 0
        self.error_records = []
        
        # Parse Excel file
        questions_data = self.parse_excel_file(file)
        
        # Import questions
        result = self.import_questions(questions_data)
        
        return result
