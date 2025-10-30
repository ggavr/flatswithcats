#!/bin/bash

# Скрипт для автоматического коммита и пуша изменений
# Использование: ./scripts/auto-commit-push.sh "commit message"

set -e

# Проверка аргументов
if [ $# -eq 0 ]; then
    echo "❌ Ошибка: Укажите сообщение коммита"
    echo "Использование: $0 \"Ваше сообщение коммита\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "🚀 Начинаем автоматический коммит и пуш..."

# Проверка статуса репозитория
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Добавляем измененные файлы..."
    git add .
    echo "✅ Файлы добавлены"
else
    echo "ℹ️  Нет изменений для коммита"
    exit 0
fi

# Создание коммита
echo "💾 Создаем коммит с сообщением: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE"
echo "✅ Коммит создан"

# Пуш в удаленный репозиторий
echo "⬆️  Пушим изменения в GitHub..."
if git push origin main; then
    echo "✅ Изменения успешно запушены!"
    echo "🔗 Посмотреть изменения: https://github.com/ggavr/flatswithcats/commits/main"
else
    echo "❌ Ошибка при пуше. Возможно, нужна аутентификация."
    echo "💡 Советы:"
    echo "   1. Убедитесь, что у вас настроен Personal Access Token"
    echo "   2. Или используйте SSH вместо HTTPS:"
    echo "      git remote set-url origin git@github.com:ggavr/flatswithcats.git"
    echo "   3. Проверьте права доступа к репозиторию"
    exit 1
fi
