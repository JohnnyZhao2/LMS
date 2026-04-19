# LMS 部署说明

适用场景：

- 前后端分开部署
- 使用公司内部 CI/CD pipeline
- 构建命令直接在平台页面里填写

当前默认域名：

- 前端：`lms.example.com`
- 后端：`lms-api.example.com`

## 上线前只需要改的文件

如果以后换成真实域名，只改这 4 个文件：

- [lms_frontend/.env.production](/Users/johnnyzhao/Documents/LMS/lms_frontend/.env.production:1)
- [lms_backend/.env.production](/Users/johnnyzhao/Documents/LMS/lms_backend/.env.production:1)
- [lms_frontend/deploy/nginx.conf](/Users/johnnyzhao/Documents/LMS/lms_frontend/deploy/nginx.conf:1)
- [lms_backend/deploy/nginx.conf](/Users/johnnyzhao/Documents/LMS/lms_backend/deploy/nginx.conf:1)

要改的值：

- 前端 `VITE_API_URL`
- 后端 `ALLOWED_HOSTS`
- 后端 `CORS_ALLOWED_ORIGINS`
- 后端 `CSRF_TRUSTED_ORIGINS`
- 前后端 `nginx.conf` 里的 `server_name`
- 前后端 `nginx.conf` 里的证书路径

## 前端流水线

工作目录：

```bash
lms_frontend
```

构建环境：

- Node.js `20` 或 `22`
- 不要用 `16`

构建命令：

```bash
npm ci && npm run build
```

产物目录：

```bash
./dist
```

探针：

- 健康检查：`/healthz`
- 就绪检查：`/readyz`

前端当前生产配置：

- [lms_frontend/.env.production](/Users/johnnyzhao/Documents/LMS/lms_frontend/.env.production:1)
- [lms_frontend/deploy/nginx.conf](/Users/johnnyzhao/Documents/LMS/lms_frontend/deploy/nginx.conf:1)

## 后端流水线

工作目录：

```bash
lms_backend
```

构建环境：

- Python `3.9+`

部署命令：

```bash
python -m pip install -r requirements.txt && python manage.py migrate --settings=config.settings.production && python manage.py collectstatic --noinput --settings=config.settings.production
```

启动命令：

```bash
gunicorn config.wsgi:application --config gunicorn.conf.py
```

探针：

- 健康检查：`/healthz`
- 就绪检查：`/readyz`

后端当前生产配置：

- [lms_backend/.env.production](/Users/johnnyzhao/Documents/LMS/lms_backend/.env.production:1)
- [lms_backend/deploy/nginx.conf](/Users/johnnyzhao/Documents/LMS/lms_backend/deploy/nginx.conf:1)
- [lms_backend/gunicorn.conf.py](/Users/johnnyzhao/Documents/LMS/lms_backend/gunicorn.conf.py:1)

## 探针说明

前端：

- `/healthz`：由 Nginx 直接返回 `200`
- `/readyz`：由 Nginx 直接返回 `200`

后端：

- `/healthz`：Django 存活检查
- `/readyz`：Django + 数据库检查

后端探针代码：

- [lms_backend/config/health.py](/Users/johnnyzhao/Documents/LMS/lms_backend/config/health.py:1)
- [lms_backend/config/urls.py](/Users/johnnyzhao/Documents/LMS/lms_backend/config/urls.py:1)

## 注意

- 后端部署时 `migrate` 不能漏
- `init_data` 不要放进每次部署流程
- 现在生产配置文件是明文提交方案，不走 `example`
- 如果平台不能设置工作目录，就把命令改成带 `cd` 的形式

前端：

```bash
cd lms_frontend && npm ci && npm run build
```

后端：

```bash
cd lms_backend && python -m pip install -r requirements.txt && python manage.py migrate --settings=config.settings.production && python manage.py collectstatic --noinput --settings=config.settings.production
```
