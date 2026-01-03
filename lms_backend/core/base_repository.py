"""
基础仓储抽象类

所有 Repository 都应继承此类，提供统一的数据访问接口。
"""
from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Optional, List, Dict, Any
from django.db.models import Model, QuerySet

T = TypeVar('T', bound=Model)


class BaseRepository(ABC, Generic[T]):
    """
    基础仓储抽象类
    
    提供通用的 CRUD 操作接口，子类需要指定 model 属性。
    """
    
    model: type[T] = None
    
    def __init__(self):
        if self.model is None:
            raise ValueError(f"{self.__class__.__name__} must set 'model' attribute")
    
    def get_by_id(self, pk: int, include_deleted: bool = False) -> Optional[T]:
        """
        根据 ID 获取实体
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录（软删除）
            
        Returns:
            实体对象或 None
        """
        qs = self.model.objects.all()
        
        # 处理软删除
        if not include_deleted and hasattr(self.model, 'is_deleted'):
            qs = qs.filter(is_deleted=False)
        
        return qs.filter(pk=pk).first()
    
    def get_all(
        self,
        filters: Dict[str, Any] = None,
        exclude: Dict[str, Any] = None,
        ordering: str = None
    ) -> QuerySet[T]:
        """
        获取所有实体（支持过滤、排序）
        
        Args:
            filters: 过滤条件
            exclude: 排除条件
            ordering: 排序字段（如 '-created_at'）
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.all()
        
        # 处理软删除
        if hasattr(self.model, 'is_deleted'):
            qs = qs.filter(is_deleted=False)
        
        if filters:
            qs = qs.filter(**filters)
        
        if exclude:
            qs = qs.exclude(**exclude)
        
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs
    
    def create(self, **data) -> T:
        """
        创建实体
        
        Args:
            **data: 实体数据
            
        Returns:
            创建的实体对象
        """
        return self.model.objects.create(**data)
    
    def update(self, instance: T, **data) -> T:
        """
        更新实体
        
        Args:
            instance: 要更新的实体对象
            **data: 更新的数据
            
        Returns:
            更新后的实体对象
        """
        for key, value in data.items():
            setattr(instance, key, value)
        instance.save()
        return instance
    
    def delete(self, instance: T, soft: bool = True) -> None:
        """
        删除实体
        
        Args:
            instance: 要删除的实体对象
            soft: 是否软删除（如果支持）
        """
        if soft and hasattr(instance, 'soft_delete'):
            instance.soft_delete()
        else:
            instance.delete()
    
    def exists(self, **filters) -> bool:
        """
        检查实体是否存在
        
        Args:
            **filters: 过滤条件
            
        Returns:
            True 如果存在
        """
        qs = self.model.objects.filter(**filters)
        if hasattr(self.model, 'is_deleted'):
            qs = qs.filter(is_deleted=False)
        return qs.exists()
    
    def count(self, **filters) -> int:
        """
        统计实体数量
        
        Args:
            **filters: 过滤条件
            
        Returns:
            数量
        """
        qs = self.model.objects.filter(**filters)
        if hasattr(self.model, 'is_deleted'):
            qs = qs.filter(is_deleted=False)
        return qs.count()
