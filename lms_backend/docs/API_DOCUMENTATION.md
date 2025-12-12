# LMS Backend API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication

所有API请求需要使用JWT tokens进行认证。

### Login
```http
POST /auth/login/
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "real_name": "系统管理员",
      "employee_id": "EMP001",
      "email": "admin@example.com",
      "phone": null,
      "department": null,
      "mentor": null,
      "join_date": null,
      "is_active": true,
      "is_staff": true,
      "roles": [
        {
          "id": 5,
          "name": "管理员",
          "code": "ADMIN",
          "assigned_at": "2024-12-12T10:00:00Z"
        }
      ],
      "created_at": "2024-12-12T10:00:00Z",
      "updated_at": "2024-12-12T10:00:00Z",
      "last_login": "2024-12-12T15:30:00Z"
    },
    "tokens": {
      "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
      "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
    }
  }
}
```

### Refresh Token
```http
POST /auth/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Logout
```http
POST /auth/logout/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "登出成功",
  "data": null
}
```

### Get Current User
```http
GET /auth/me/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "id": 1,
    "username": "admin",
    "real_name": "系统管理员",
    "employee_id": "EMP001",
    "email": "admin@example.com",
    "phone": null,
    "department": null,
    "mentor": null,
    "join_date": null,
    "is_active": true,
    "is_staff": true,
    "roles": [
      {
        "id": 5,
        "name": "管理员",
        "code": "ADMIN",
        "assigned_at": "2024-12-12T10:00:00Z"
      }
    ],
    "created_at": "2024-12-12T10:00:00Z",
    "updated_at": "2024-12-12T10:00:00Z",
    "last_login": "2024-12-12T15:30:00Z"
  }
}
```

### Switch Role
```http
POST /auth/switch-role/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "role_code": "MENTOR"
}
```

**Response:**
```json
{
  "success": true,
  "message": "已切换到导师角色",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "real_name": "系统管理员",
      "employee_id": "EMP001",
      "email": "admin@example.com",
      "phone": null,
      "department": null,
      "mentor": null,
      "join_date": null,
      "is_active": true,
      "is_staff": true,
      "roles": [
        {
          "id": 2,
          "name": "导师",
          "code": "MENTOR",
          "assigned_at": "2024-01-01T10:00:00Z"
        },
        {
          "id": 5,
          "name": "管理员",
          "code": "ADMIN",
          "assigned_at": "2024-12-12T10:00:00Z"
        }
      ],
      "created_at": "2024-12-12T10:00:00Z",
      "updated_at": "2024-12-12T10:00:00Z",
      "last_login": "2024-12-12T15:30:00Z"
    },
    "active_role": "MENTOR"
  }
}
```

---

## Users

### List Users
```http
GET /users/?page=1&page_size=20
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page` (optional): 页码 (default: 1)
- `page_size` (optional): 每页数量 (default: 20)
- `department` (optional): 按部门ID筛选
- `is_active` (optional): 按激活状态筛选
- `search` (optional): 搜索关键词（username, real_name, employee_id, email）
- `ordering` (optional): 排序字段 (created_at, join_date)

**Response:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "username": "admin",
      "real_name": "系统管理员",
      "employee_id": "EMP001",
      "email": "admin@example.com",
      "phone": null,
      "department": null,
      "department_name": null,
      "mentor": null,
      "mentor_name": null,
      "join_date": null,
      "is_active": true,
      "roles": [
        {
          "id": 5,
          "name": "管理员",
          "code": "ADMIN"
        }
      ],
      "created_at": "2024-12-12T10:00:00Z",
      "updated_at": "2024-12-12T10:00:00Z"
    }
  ]
}
```

### Create User
```http
POST /users/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "username": "new_user",
  "password": "SecurePass123!",
  "real_name": "新用户",
  "employee_id": "EMP002",
  "email": "newuser@example.com",
  "phone": "13900139000",
  "department": 1,
  "mentor": 5,
  "join_date": "2024-12-01"
}
```

**Response:**
```json
{
  "id": 10,
  "username": "new_user",
  "real_name": "新用户",
  "employee_id": "EMP002",
  "email": "newuser@example.com",
  "phone": "13900139000",
  "department": 1,
  "department_name": "一室",
  "mentor": 5,
  "mentor_name": "导师姓名",
  "join_date": "2024-12-01",
  "is_active": true,
  "roles": [
    {
      "id": 1,
      "name": "学员",
      "code": "STUDENT"
    }
  ],
  "created_at": "2024-12-13T10:00:00Z",
  "updated_at": "2024-12-13T10:00:00Z"
}
```

**Note:** 新创建的用户会自动分配"学员"角色

### Get User Detail
```http
GET /users/{id}/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "real_name": "系统管理员",
  "employee_id": "EMP001",
  "email": "admin@example.com",
  "phone": null,
  "department": {
    "id": 1,
    "name": "一室",
    "code": "DEPT_ONE",
    "manager": 5,
    "manager_name": "室经理",
    "description": "第一部门",
    "created_at": "2024-12-12T10:00:00Z"
  },
  "mentor": {
    "id": 5,
    "username": "mentor1",
    "real_name": "导师姓名",
    "employee_id": "EMP005",
    "email": "mentor@example.com",
    "phone": "13800138000",
    "department": 1,
    "department_name": "一室",
    "mentor": null,
    "mentor_name": null,
    "join_date": "2024-01-01",
    "is_active": true,
    "roles": [
      {
        "id": 2,
        "name": "导师",
        "code": "MENTOR"
      }
    ],
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  },
  "join_date": null,
  "is_active": true,
  "is_staff": true,
  "roles": [
    {
      "id": 5,
      "name": "管理员",
      "code": "ADMIN",
      "assigned_at": "2024-12-12T10:00:00Z"
    }
  ],
  "created_at": "2024-12-12T10:00:00Z",
  "updated_at": "2024-12-12T10:00:00Z",
  "last_login": "2024-12-12T15:30:00Z"
}
```

### Update User
```http
PUT /users/{id}/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "real_name": "更新后的名字",
  "email": "updated@example.com",
  "department": 2
}
```

**Response:**
```json
{
  "id": 10,
  "username": "new_user",
  "real_name": "更新后的名字",
  "employee_id": "EMP002",
  "email": "updated@example.com",
  "phone": "13900139000",
  "department": 2,
  "department_name": "二室",
  "mentor": 5,
  "mentor_name": "导师姓名",
  "join_date": "2024-12-01",
  "is_active": true,
  "roles": [
    {
      "id": 1,
      "name": "学员",
      "code": "STUDENT"
    }
  ],
  "created_at": "2024-12-13T10:00:00Z",
  "updated_at": "2024-12-13T10:30:00Z"
}
```

### Assign Role to User
```http
POST /users/{id}/assign-role/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "role_id": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "分配角色：导师",
  "data": {
    "id": 10,
    "username": "new_user",
    "real_name": "新用户",
    "employee_id": "EMP002",
    "email": "newuser@example.com",
    "phone": "13900139000",
    "department": {
      "id": 1,
      "name": "一室",
      "code": "DEPT_ONE",
      "manager": 5,
      "manager_name": "室经理",
      "description": "第一部门",
      "created_at": "2024-12-12T10:00:00Z"
    },
    "mentor": {
      "id": 5,
      "username": "mentor1",
      "real_name": "导师姓名",
      "employee_id": "EMP005",
      "email": "mentor@example.com",
      "phone": "13800138000",
      "department": 1,
      "department_name": "一室",
      "mentor": null,
      "mentor_name": null,
      "join_date": "2024-01-01",
      "is_active": true,
      "roles": [
        {
          "id": 2,
          "name": "导师",
          "code": "MENTOR"
        }
      ],
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    },
    "join_date": "2024-12-01",
    "is_active": true,
    "is_staff": false,
    "roles": [
      {
        "id": 1,
        "name": "学员",
        "code": "STUDENT",
        "assigned_at": "2024-12-13T10:00:00Z"
      },
      {
        "id": 2,
        "name": "导师",
        "code": "MENTOR",
        "assigned_at": "2024-12-13T10:30:00Z"
      }
    ],
    "created_at": "2024-12-13T10:00:00Z",
    "updated_at": "2024-12-13T10:30:00Z",
    "last_login": null
  }
}
```

### Remove Role from User
```http
POST /users/{id}/remove-role/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "role_id": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "已移除角色：导师",
  "data": {
    "id": 10,
    "username": "new_user",
    "real_name": "新用户",
    "employee_id": "EMP002",
    "email": "newuser@example.com",
    "phone": "13900139000",
    "department": {
      "id": 1,
      "name": "一室",
      "code": "DEPT_ONE",
      "manager": 5,
      "manager_name": "室经理",
      "description": "第一部门",
      "created_at": "2024-12-12T10:00:00Z"
    },
    "mentor": {
      "id": 5,
      "username": "mentor1",
      "real_name": "导师姓名",
      "employee_id": "EMP005",
      "email": "mentor@example.com",
      "phone": "13800138000",
      "department": 1,
      "department_name": "一室",
      "mentor": null,
      "mentor_name": null,
      "join_date": "2024-01-01",
      "is_active": true,
      "roles": [
        {
          "id": 2,
          "name": "导师",
          "code": "MENTOR"
        }
      ],
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    },
    "join_date": "2024-12-01",
    "is_active": true,
    "is_staff": false,
    "roles": [
      {
        "id": 1,
        "name": "学员",
        "code": "STUDENT",
        "assigned_at": "2024-12-13T10:00:00Z"
      }
    ],
    "created_at": "2024-12-13T10:00:00Z",
    "updated_at": "2024-12-13T10:30:00Z",
    "last_login": null
  }
}
```

---

## Roles

### List Roles
```http
GET /roles/
Authorization: Bearer {access_token}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "学员",
    "code": "STUDENT",
    "description": "普通学员",
    "created_at": "2024-12-12T10:00:00Z"
  },
  {
    "id": 2,
    "name": "导师",
    "code": "MENTOR",
    "description": "导师角色",
    "created_at": "2024-12-12T10:00:00Z"
  }
]
```

---

## Departments

### List Departments
```http
GET /departments/
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `search` (optional): 搜索关键词（name, code）
- `ordering` (optional): 排序字段 (created_at)

**Response:**
```json
[
  {
    "id": 1,
    "name": "一室",
    "code": "DEPT_ONE",
    "manager": 5,
    "manager_name": "室经理",
    "description": "第一部门",
    "created_at": "2024-12-12T10:00:00Z"
  }
]
```

### Create Department
```http
POST /departments/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "三室",
  "code": "DEPT_THREE",
  "manager": 8,
  "description": "第三部门"
}
```

**Response:**
```json
{
  "id": 3,
  "name": "三室",
  "code": "DEPT_THREE",
  "manager": 8,
  "manager_name": "经理姓名",
  "description": "第三部门",
  "created_at": "2024-12-13T10:00:00Z"
}
```

### Get Department Detail
```http
GET /departments/{id}/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": 1,
  "name": "一室",
  "code": "DEPT_ONE",
  "manager": 5,
  "manager_name": "室经理",
  "description": "第一部门",
  "created_at": "2024-12-12T10:00:00Z"
}
```

### Update Department
```http
PUT /departments/{id}/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "更新后的名称",
  "manager": 10
}
```

**Response:**
```json
{
  "id": 1,
  "name": "更新后的名称",
  "code": "DEPT_ONE",
  "manager": 10,
  "manager_name": "新经理姓名",
  "description": "第一部门",
  "created_at": "2024-12-12T10:00:00Z"
}
```

---

## Knowledge - 应急操作手册

### 操作类型 (Operation Types)

#### List Operation Types
```http
GET /knowledge/operation-types/
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `search` (optional): 搜索关键词（name, code）
- `ordering` (optional): 排序字段 (sort_order, created_at)

**Response:**
```json
[
  {
    "id": 1,
    "name": "重启",
    "code": "RESTART",
    "description": "重启服务或系统",
    "sort_order": 1,
    "created_at": "2024-12-12T10:00:00Z"
  }
]
```

#### Create Operation Type (Admin only)
```http
POST /knowledge/operation-types/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "新操作",
  "code": "NEW_OP",
  "description": "新操作类型",
  "sort_order": 10
}
```

**Response:**
```json
{
  "id": 7,
  "name": "新操作",
  "code": "NEW_OP",
  "description": "新操作类型",
  "sort_order": 10,
  "created_at": "2024-12-13T10:00:00Z"
}
```

---

### 分类 (Categories) - 条线和系统

#### List Categories
```http
GET /knowledge/categories/
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `level` (optional): 筛选层级 (1=条线, 2=系统)
- `parent` (optional): 筛选父分类ID
- `search` (optional): 搜索关键词（name, code）
- `ordering` (optional): 排序字段 (level, sort_order, created_at)

**Response:**
```json
{
  "count": 7,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "双云",
      "code": "CLOUD",
      "level": 1,
      "level_display": "条线",
      "parent": null,
      "parent_name": null,
      "description": "云平台相关",
      "sort_order": 1,
      "children_count": 2,
      "created_at": "2024-12-12T10:00:00Z",
      "updated_at": "2024-12-12T10:00:00Z"
    }
  ]
}
```

#### Get Category Tree
```http
GET /knowledge/categories/tree/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": [
    {
      "id": 3,
      "name": "数据库",
      "code": "DATABASE",
      "level": 1,
      "level_display": "条线",
      "description": "数据库相关",
      "sort_order": 3,
      "children": [
        {
          "id": 13,
          "name": "MySQL数据库",
          "code": "DB_MYSQL",
          "level": 2,
          "level_display": "系统",
          "description": null,
          "sort_order": 1,
          "children": []
        }
      ]
    }
  ]
}
```

#### Get Child Categories
```http
GET /knowledge/categories/children/?parent_id=3
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": [
    {
      "id": 13,
      "name": "MySQL数据库",
      "code": "DB_MYSQL",
      "level": 2,
      "level_display": "系统",
      "parent": 3,
      "parent_name": "数据库",
      "description": null,
      "sort_order": 1,
      "children_count": 0,
      "created_at": "2024-12-12T10:00:00Z",
      "updated_at": "2024-12-12T10:00:00Z"
    }
  ]
}
```

#### Create Category (Admin only)
```http
POST /knowledge/categories/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "新条线",
  "code": "NEW_LINE",
  "level": 1,
  "parent": null,
  "description": "新条线描述",
  "sort_order": 10
}
```

**Response:**
```json
{
  "id": 8,
  "name": "新条线",
  "code": "NEW_LINE",
  "level": 1,
  "level_display": "条线",
  "parent": null,
  "parent_name": null,
  "description": "新条线描述",
  "sort_order": 10,
  "children_count": 0,
  "created_at": "2024-12-13T10:00:00Z",
  "updated_at": "2024-12-13T10:00:00Z"
}
```

#### Delete Category (Admin only)
```http
DELETE /knowledge/categories/{id}/
Authorization: Bearer {access_token}
```

**Success Response:**
```json
{
  "success": true,
  "message": "删除成功",
  "data": null
}
```

**Error Response (有子分类):**
```json
{
  "success": false,
  "message": "该分类下有子分类，无法删除",
  "data": null
}
```

**Error Response (有关联手册):**
```json
{
  "success": false,
  "message": "该分类下有关联的应急操作手册，无法删除",
  "data": null
}
```

**Note:** 只能删除没有子分类且没有关联应急操作手册的分类

---

### 应急操作手册 (Emergency Operation Manuals)

#### List Manuals
```http
GET /knowledge/
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (optional): 筛选状态 (DRAFT/PUBLISHED/ARCHIVED)
- `line` (optional): 筛选条线ID
- `system` (optional): 筛选系统ID
- `creator` (optional): 筛选创建人ID
- `search` (optional): 搜索关键词（title, content_scenario, content_solution）
- `ordering` (optional): 排序字段 (created_at, updated_at, view_count)
- `page` (optional): 页码
- `page_size` (optional): 每页数量

**Response:**
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "MySQL数据库主从切换应急操作",
      "summary": "MySQL主从架构发生故障时的应急切换操作手册",
      "cover_image": null,
      "line_name": "数据库",
      "system_name": "MySQL数据库",
      "operation_type_names": ["重启", "切换"],
      "status": "PUBLISHED",
      "status_display": "已发布",
      "view_count": 0,
      "creator_name": "系统管理员",
      "created_at": "2024-12-12T10:00:00Z",
      "updated_at": "2024-12-12T10:00:00Z"
    }
  ]
}
```

#### Get Manual Detail
```http
GET /knowledge/{id}/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "id": 1,
    "title": "MySQL数据库主从切换应急操作",
    "summary": "MySQL主从架构发生故障时的应急切换操作手册",
    "cover_image": null,
    "attachment_url": null,
    
    "content": {
      "scenario": "主库出现故障，无法提供服务",
      "trigger": "1. 监控系统报警\n2. 确认主库无法访问",
      "solution": "1. 停止应用写入\n2. 提升从库为主库",
      "verification": "1. 检查新主库状态\n2. 验证应用读写",
      "recovery": "1. 修复原主库\n2. 配置为从库"
    },
    
    "content_scenario": "主库出现故障，无法提供服务",
    "content_trigger": "1. 监控系统报警\n2. 确认主库无法访问",
    "content_solution": "1. 停止应用写入\n2. 提升从库为主库",
    "content_verification": "1. 检查新主库状态\n2. 验证应用读写",
    "content_recovery": "1. 修复原主库\n2. 配置为从库",
    
    "line": 3,
    "line_name": "数据库",
    "system": 13,
    "system_name": "MySQL数据库",
    
    "operation_types_detail": [
      {
        "id": 1,
        "name": "重启",
        "code": "RESTART",
        "description": "重启服务或系统",
        "sort_order": 1,
        "created_at": "2024-12-12T10:00:00Z"
      }
    ],
    
    "deliverer": null,
    "deliverer_name": null,
    "creator": 1,
    "creator_name": "系统管理员",
    "creator_team": null,
    "creator_team_name": null,
    "modifier": null,
    "modifier_name": null,
    "executors_detail": [],
    
    "emergency_platform": "数据库管理平台",
    "status": "PUBLISHED",
    "status_display": "已发布",
    "view_count": 0,
    "is_deleted": false,
    "deleted_at": null,
    "created_at": "2024-12-12T10:00:00Z",
    "updated_at": "2024-12-12T10:00:00Z"
  }
}
```

#### Search Manuals
```http
GET /knowledge/search/?keyword=数据库
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "搜索成功",
  "data": [
    {
      "id": 1,
      "title": "MySQL数据库主从切换应急操作",
      "summary": "MySQL主从架构发生故障时的应急切换操作手册",
      "cover_image": null,
      "line_name": "数据库",
      "system_name": "MySQL数据库",
      "operation_type_names": ["重启", "切换"],
      "status": "PUBLISHED",
      "status_display": "已发布",
      "view_count": 0,
      "creator_name": "系统管理员",
      "created_at": "2024-12-12T10:00:00Z",
      "updated_at": "2024-12-12T10:00:00Z"
    }
  ]
}
```

#### Filter by Line
```http
GET /knowledge/by-line/?line_id=3
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": [
    {
      "id": 1,
      "title": "MySQL数据库主从切换应急操作",
      "summary": "MySQL主从架构发生故障时的应急切换操作手册",
      "cover_image": null,
      "line_name": "数据库",
      "system_name": "MySQL数据库",
      "operation_type_names": ["重启", "切换"],
      "status": "PUBLISHED",
      "status_display": "已发布",
      "view_count": 0,
      "creator_name": "系统管理员",
      "created_at": "2024-12-12T10:00:00Z",
      "updated_at": "2024-12-12T10:00:00Z"
    }
  ]
}
```

#### Filter by System
```http
GET /knowledge/by-system/?system_id=13
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": [
    {
      "id": 1,
      "title": "MySQL数据库主从切换应急操作",
      "summary": "MySQL主从架构发生故障时的应急切换操作手册",
      "cover_image": null,
      "line_name": "数据库",
      "system_name": "MySQL数据库",
      "operation_type_names": ["重启", "切换"],
      "status": "PUBLISHED",
      "status_display": "已发布",
      "view_count": 0,
      "creator_name": "系统管理员",
      "created_at": "2024-12-12T10:00:00Z",
      "updated_at": "2024-12-12T10:00:00Z"
    }
  ]
}
```

#### Create Manual (Management roles only)
```http
POST /knowledge/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "新应急操作手册",
  "summary": "手册摘要",
  "content_scenario": "故障场景描述",
  "content_trigger": "触发流程",
  "content_solution": "解决方案",
  "content_verification": "验证方案",
  "content_recovery": "恢复方案",
  "line": 3,
  "system": 13,
  "operation_type_ids": [1, 5],
  "deliverer": 2,
  "executor_ids": [3, 4],
  "emergency_platform": "数据库管理平台",
  "status": "DRAFT"
}
```

**Required Fields (必填字段):**
- `title`: 标题
- `content_scenario`: 故障场景
- `content_trigger`: 触发流程
- `content_solution`: 解决方案
- `content_verification`: 验证方案
- `content_recovery`: 恢复方案
- `line`: 所属条线ID
- `system`: 所属系统ID

**Optional Fields (可选字段):**
- `summary`: 摘要
- `cover_image`: 封面图片URL
- `attachment_url`: 附件链接
- `operation_type_ids`: 操作类型ID列表
- `deliverer`: 场景交付人ID
- `executor_ids`: 可执行人ID列表
- `emergency_platform`: 应急平台
- `status`: 状态 (DRAFT/PUBLISHED/ARCHIVED，默认DRAFT)

**Auto-filled Fields (自动填充):**
- `creator`: 创建人（从当前登录用户获取）
- `creator_team`: 创建人所属团队（从当前登录用户的部门获取）
- `modifier`: 修改人（更新时自动设置）

#### Update Manual (Management roles only)
```http
PUT /knowledge/{id}/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "更新后的标题",
  "content_solution": "更新后的解决方案",
  "operation_type_ids": [1, 2, 5]
}
```

**Note:** 
- 支持部分更新（PATCH）或完整更新（PUT）
- 所有字段都是可选的，只更新提供的字段
- `operation_type_ids`: 操作类型ID列表（写入时使用）
- `executor_ids`: 可执行人ID列表（写入时使用）
- `modifier`: 修改人会自动从当前登录用户获取

#### Publish Manual (Management roles only)
```http
POST /knowledge/{id}/publish/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "发布成功",
  "data": {...}
}
```

#### Archive Manual (Management roles only)
```http
POST /knowledge/{id}/archive/
Authorization: Bearer {access_token}
```

#### Delete Manual (Soft delete, Management roles only)
```http
DELETE /knowledge/{id}/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "删除成功",
  "data": null
}
```

---

## Error Responses

所有错误响应遵循以下格式：

```json
{
  "success": false,
  "message": "错误信息",
  "data": null
}
```

### Common HTTP Status Codes

- `200 OK`: 请求成功
- `400 Bad Request`: 请求参数错误或验证失败
- `401 Unauthorized`: 未认证或token无效
- `403 Forbidden`: 权限不足
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器错误

---

## Permission System

### Role Hierarchy

1. **STUDENT (学员)**: 基础角色，只能查看分配给自己的内容
2. **MENTOR (导师)**: 可以管理自己的学员
3. **DEPT_MANAGER (室经理)**: 可以管理本部门员工
4. **TEAM_MANAGER (团队经理)**: 可以管理所有部门
5. **ADMIN (管理员)**: 完全权限

### Permission Rules

#### Users
- **查看**: 根据角色过滤（学员只能看自己，导师看自己的学员，室经理看本部门，团队经理和管理员看所有）
- **创建/更新/删除**: 管理员

#### Departments
- **查看**: 根据角色过滤
- **创建/更新/删除**: 管理员和团队经理

#### Knowledge Categories & Operation Types
- **查看**: 所有认证用户
- **创建/更新/删除**: 仅管理员

#### Knowledge (应急操作手册)
- **查看**: 所有认证用户（非管理员只能看已发布且未删除的）
- **创建/更新/删除/发布/归档**: 管理角色（导师、室经理、团队经理、管理员）
- **管理员特权**: 可以看到所有手册（包括草稿和已删除的）

---

## Data Initialization

### Initialize Test Data

```bash
# 激活虚拟环境
conda activate lms

# 初始化角色数据
python manage.py init_roles

# 创建测试用户
python manage.py create_test_user

# 初始化应急操作手册数据
python manage.py init_knowledge_data
```

这将创建：
- 5个系统角色（学员、导师、室经理、团队经理、管理员）
- 1个测试管理员用户（username: admin, password: admin123）
- 6个操作类型（重启、隔离、停止、回滚、切换、修复）
- 7个条线（双云、网络、数据库、应用、应急、规章制度、其他）
- 10个系统（AWS云平台、阿里云平台、防火墙、MySQL数据库、Redis缓存等）
- 4篇应急操作手册（3篇已发布，1篇草稿）

---

## API Version

**Version:** v1.0  
**Last Updated:** 2024-12-12

---

## Notes

1. 本API文档仅包含**已实现**的功能
2. 题库、测验、任务、答题、评分等功能尚未实现
3. 所有时间字段使用ISO 8601格式（UTC时区）
4. 所有列表接口支持分页，默认每页20条
5. JWT token有效期：access token 1小时，refresh token 7天
