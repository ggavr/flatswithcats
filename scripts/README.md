# Скрипты автоматизации Git

Этот каталог содержит скрипты для автоматического коммита и пуша изменений в GitHub.

## 🚀 Быстрый старт

### Через npm скрипты (рекомендуется)

```bash
# Коммит и пуш всех изменений
npm run commit "feat: add new search functionality"

# Или то же самое
npm run commit:push "fix: resolve login bug"
```

### Через Node.js скрипт

```bash
# Коммит и пуш всех изменений
node scripts/auto-commit.js "feat: add user authentication"

# Просмотр справки
node scripts/auto-commit.js
```

### Через bash скрипт

```bash
# Коммит и пуш всех изменений
./scripts/auto-commit-push.sh "docs: update API documentation"
```

## 📋 Что делает скрипт

1. **Проверяет наличие изменений** - если нет изменений, завершается
2. **Добавляет все файлы** - `git add .`
3. **Создает коммит** - с вашим сообщением
4. **Пушит в GitHub** - в ветку `main`

## 🔧 Настройка аутентификации

Для работы с GitHub нужно настроить аутентификацию:

### Вариант 1: Personal Access Token (рекомендуется)

1. Создайте Personal Access Token в GitHub:
   - Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Установите scopes: `repo`

2. Используйте token как пароль при пуше:
   ```bash
   # Git попросит username и password
   # Username: ваш_github_username
   # Password: ваш_personal_access_token
   ```

### Вариант 2: SSH ключ

```bash
# Измените remote URL на SSH
git remote set-url origin git@github.com:ggavr/flatswithcats.git

# Добавьте SSH ключ в ssh-agent
ssh-add ~/.ssh/id_rsa

# Проверьте подключение
ssh -T git@github.com
```

## 📝 Примеры использования

```bash
# Фича
npm run commit "feat: add user profile page"

# Исправление бага
npm run commit "fix: resolve photo upload issue"

# Документация
npm run commit "docs: update installation guide"

# Стиль кода
npm run commit "style: format code with prettier"

# Рефакторинг
npm run commit "refactor: simplify auth middleware"

# Тесты
npm run commit "test: add unit tests for API routes"
```

## 🛠️ Интеграция с Cursor

### Вариант 1: Пользовательские команды

В Cursor можно создать пользовательскую команду:

1. **Command Palette** → **Preferences: Open User Tasks**
2. Добавьте новую задачу:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Git: Auto Commit & Push",
      "type": "shell",
      "command": "npm",
      "args": ["run", "commit"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": []
    }
  ]
}
```

### Вариант 2: Клавиатурные сокращения

1. **Command Palette** → **Preferences: Open Keyboard Shortcuts**
2. Найдите "Run Task" и настройте сочетание клавиш
3. Выберите задачу "Git: Auto Commit & Push"

### Вариант 3: Через терминал Cursor

Просто используйте в терминале Cursor:

```bash
npm run commit "ваш commit message"
```

## 🔍 Диагностика

### Проблема: "Device not configured"

**Решение:**
- Настройте Personal Access Token
- Или используйте SSH

### Проблема: "Permission denied"

**Решение:**
- Проверьте права доступа к репозиторию
- Убедитесь, что token имеет scope `repo`

### Проблема: "No changes to commit"

**Решение:**
- Скрипт автоматически обнаруживает отсутствие изменений
- Убедитесь, что файлы не в .gitignore

## 📊 Логи и отладка

Скрипт выводит подробную информацию о каждом шаге:

```
🚀 Начинаем автоматический коммит и пуш...

🔄 Добавление файлов в индекс...
✅ Добавление файлов в индекс завершено

📝 Изменения для коммита:
M  src/api/routes/listings.ts
A  new-feature.js

🔄 Создание коммита "feat: add search"...
✅ Создание коммита "feat: add search" завершено

📋 Коммит: a1b2c3d4

🔄 Пуш в GitHub...
✅ Пуш в GitHub завершено

✅ Изменения успешно запушены!
🔗 Посмотреть изменения: https://github.com/ggavr/flatswithcats/commit/a1b2c3d4
```

## 🎯 Советы по использованию

1. **Используйте осмысленные сообщения коммитов** - следуйте conventional commits
2. **Коммитьте часто** - небольшие, логичные изменения
3. **Проверяйте перед коммитом** - `git status` и `git diff`
4. **Используйте stash** - если нужно временно сохранить изменения

## 🔐 Безопасность

- Никогда не коммитьте секретные ключи, пароли или токены
- Проверяйте `.gitignore` перед коммитом
- Используйте Personal Access Tokens вместо паролей

---

**Приятного коммитинга! 🚀**
