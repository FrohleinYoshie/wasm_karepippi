//go:build js && wasm
// +build js,wasm

package main

import (
	"regexp"
	"strings"
	"syscall/js"
)

// 入力検証とエラーメッセージを含む結果の構造
type ValidationResult struct {
	IsValid bool
	Message string
}

// 文字列置換の結果を含む構造
type ReplacementResult struct {
	DisplayText string
	Error       string
}

// ひらがな・カタカナの検証
func validateKana(input string) ValidationResult {
	if input == "" {
		return ValidationResult{IsValid: true, Message: ""}
	}

	if len([]rune(input)) > 10 {
		return ValidationResult{IsValid: false, Message: "10文字以内で入力してください"}
	}

	// ひらがな・カタカナの正規表現パターン
	pattern := regexp.MustCompile(`^[\p{Hiragana}\p{Katakana}]+$`)
	if !pattern.MatchString(input) {
		return ValidationResult{IsValid: false, Message: "ひらがなまたはカタカナのみ入力できます"}
	}

	return ValidationResult{IsValid: true, Message: ""}
}

// 置換後テキストの検証
func validateShortText(input string) ValidationResult {
	if len([]rune(input)) > 30 {
		return ValidationResult{IsValid: false, Message: "30文字以内で入力してください"}
	}
	return ValidationResult{IsValid: true, Message: ""}
}

// 文字列置換の処理
func performReplacement(searchText string, replaceText string, originalText string) ReplacementResult {
	if searchText == "" || originalText == "" {
		return ReplacementResult{DisplayText: originalText, Error: ""}
	}

	// 入力の検証
	kanaValidation := validateKana(searchText)
	if !kanaValidation.IsValid {
		return ReplacementResult{DisplayText: originalText, Error: kanaValidation.Message}
	}

	shortTextValidation := validateShortText(replaceText)
	if !shortTextValidation.IsValid {
		return ReplacementResult{DisplayText: originalText, Error: shortTextValidation.Message}
	}

	// 文字列置換の実行
	result := strings.ReplaceAll(originalText, searchText, replaceText)
	return ReplacementResult{DisplayText: result, Error: ""}
}

// validateKanaをJavaScriptから呼び出せるようにラップ
func validateKanaWrapper(this js.Value, args []js.Value) interface{} {
	if len(args) != 1 {
		return map[string]interface{}{
			"isValid": false,
			"message": "Invalid arguments",
		}
	}

	input := args[0].String()
	result := validateKana(input)

	return map[string]interface{}{
		"isValid": result.IsValid,
		"message": result.Message,
	}
}

// replaceTextをJavaScriptから呼び出せるようにラップ
func replaceTextWrapper(this js.Value, args []js.Value) interface{} {
	if len(args) != 3 {
		return map[string]interface{}{
			"displayText": "",
			"error":      "Invalid arguments",
		}
	}

	searchText := args[0].String()
	replaceText := args[1].String()
	originalText := args[2].String()

	result := performReplacement(searchText, replaceText, originalText)

	return map[string]interface{}{
		"displayText": result.DisplayText,
		"error":      result.Error,
	}
}

func main() {
	c := make(chan struct{}, 0)

	// JavaScript側から呼び出せる関数として登録
	js.Global().Set("validateKanaWasm", js.FuncOf(validateKanaWrapper))
	js.Global().Set("replaceTextWasm", js.FuncOf(replaceTextWrapper))

	<-c
}