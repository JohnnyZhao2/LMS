"""
通用基础视图类
提供 Service 层构造器注入的支持。
"""
from rest_framework.views import APIView


class BaseAPIView(APIView):
    """
    支持 Service 自动注入的 APIView 基类
    
    使用方式:
        class MyView(BaseAPIView):
            service_class = MyService  # 声明 Service 类
            
            def get(self, request):
                result = self.service.do_something()  # 自动注入 request
    """
    
    # 子类需要定义这个属性
    service_class = None
    
    # 缓存 service 实例
    _service_instance = None
    
    @property
    def service(self):
        """
        获取注入了 request 的 Service 实例
        
        每个请求只创建一次（懒加载）
        """
        if self._service_instance is None:
            if self.service_class is None:
                raise ValueError(
                    f"{self.__class__.__name__} 必须定义 service_class 属性"
                )
            self._service_instance = self.service_class(self.request)
        return self._service_instance
    
    def initial(self, request, *args, **kwargs):
        """
        每次请求开始时重置 service 实例
        确保每个请求都有一个新的 Service 实例
        """
        super().initial(request, *args, **kwargs)
        self._service_instance = None  # 重置缓存
