import re
import time
import sys
import json

from pytrends.request import TrendReq

# Initialize Google Trends connection
pytrends = TrendReq(hl='en-US', tz=360)

# Function to analyze keywords from JSON input
def analyze_from_json(json_data):
    data = json.loads(json_data)
    keywords = set()
    
    # Extract common tags
    if 'common' in data:
        keywords.update(tag for tag, _ in data['common'])
    
    # Extract unique tags
    if 'unique' in data:
        keywords.update(tag for tag, _ in data['unique'])
    
    # Filter and analyze keywords
    filtered_keywords = filter_keywords(keywords)
    trends_data = analyze_keywords(filtered_keywords)
    result = format_output(trends_data)
    
    # Return JSON response
    return json.dumps({
        'trends': result,
        'status': 'success'
    })

# Функция для загрузки и обработки ключевых слов из файла
def load_keywords(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        # Извлечение Common Tags и Unique Tags
        common_tags = re.findall(r"Common Tags:\s*(.*?)\s*Unique Tags:", content, re.DOTALL)
        unique_tags = re.findall(r"Unique Tags:\s*(.*)", content, re.DOTALL)

        # Объединение списков и удаление дубликатов
        keywords = set()
        if common_tags:
            keywords.update(map(str.strip, common_tags[0].split(',')))
        if unique_tags:
            keywords.update(map(str.strip, unique_tags[0].split(',')))

        # Фильтрация ключевых слов
        keywords = filter_keywords(keywords)

        return list(keywords)
    except FileNotFoundError:
        print("Файл не найден. Пожалуйста, проверьте путь и повторите попытку.")
        return []


# Функция для фильтрации ключевых слов
def filter_keywords(keywords):
    filtered_keywords = []
    for keyword in keywords:
        # Удаление спецсимволов и лишних пробелов
        clean_keyword = re.sub(r"[^\w\s]", "", keyword).strip()
        if 0 < len(clean_keyword) <= 50:  # Ограничение длины ключевого слова
            filtered_keywords.append(clean_keyword)
    return filtered_keywords


# Функция для анализа популярности ключевых слов на YouTube в США
def analyze_keywords(keywords):
    trends_data = []
    error_keywords = []  # Для хранения ключевых слов, вызвавших ошибку

    for keyword in keywords:
        try:
            print(f"Обработка ключевого слова: {keyword}")  # Отладочная информация
            time.sleep(3)  # Пауза в 3 секунды между запросами

            # Пытаемся выполнить запрос с текущим ключевым словом
            pytrends.build_payload([keyword], timeframe='today 12-m', geo='US', gprop='youtube')
            data = pytrends.interest_over_time()

            if not data.empty and 'isPartial' in data.columns:
                avg_interest = data[keyword].mean()  # Среднее значение интереса за 6 месяцев
                trends_data.append((keyword, avg_interest))

        except Exception as e:
            print(f"Ошибка при обработке ключевого слова '{keyword}': {e}")
            error_keywords.append(keyword)  # Добавляем в список ошибок

    # Логируем ключевые слова с ошибками
    if error_keywords:
        print("\nКлючевые слова, вызвавшие ошибку:")
        for word in error_keywords:
            print(f"- {word}")

    trends_data.sort(key=lambda x: x[1], reverse=True)
    return trends_data


# Функция для вывода ключевых слов с ограничением в 500 символов
def format_output(trends_data):
    output = ""
    for keyword, popularity in trends_data:
        entry = f"{keyword} ({popularity:.2f}), "
        if len(output) + len(entry) > 1000:
            break
        output += entry
    return output.strip(", ")


# Функция для записи результатов в файл tags.txt
def save_tags_to_file(formatted_keywords, filename="tags.txt"):
    # Удаляем значения в скобках, оставляя только ключевые слова
    keywords = re.sub(r"\s\(\d+\.\d+\)", "", formatted_keywords)

    # Ограничиваем строку до 500 символов и записываем в файл
    with open(filename, "w", encoding="utf-8") as file:
        file.write(keywords[:1000].strip(", "))
    print(f"Результаты записаны в файл {filename}")


# Modified main function to handle both CLI and JSON input
def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--json':
        # Read JSON input from stdin
        json_input = sys.stdin.read()
        result = analyze_from_json(json_input)
        print(result)
    else:
        # Original CLI behavior
        file_path = input("Enter the path to the keywords file: ").strip()
        keywords = load_keywords(file_path)
        
        if keywords:
            popular_keywords = analyze_keywords(keywords)
            result = format_output(popular_keywords)
            save_tags_to_file(result)
            print("Most popular keywords in the last 6 months (up to 500 characters):")
            print(result)
        else:
            print("Failed to load keywords. Check file contents.")

if __name__ == "__main__":
    main()