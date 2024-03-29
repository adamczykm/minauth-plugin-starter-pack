#!/bin/bash

# Define the default package name
defaultPackageName="minauth-plugin-starter"

# Ask for the new package name
read -p "Enter the new package name [$defaultPackageName]: " packageName
packageName=${packageName:-$defaultPackageName}

# Update the package name in package.json if it's not the default
if [ "$packageName" != "$defaultPackageName" ]; then
  jq --arg pn "$packageName" '.name = $pn' package.json > tmp.$$.json && mv tmp.$$.json package.json
fi

# Function to rename a class in .ts files within src and test directories
rename_class() {
  local oldClassName=$1
  local newClassName=$2
  if [ "$oldClassName" != "$newClassName" ]; then
    if [[ "$(uname)" == "Darwin" ]]; then
      find src test -type f -name "*.ts" -exec sed -i '' "s/$oldClassName/$newClassName/g" {} +
    else
      find src test -type f -name "*.ts" -exec sed -i "s/$oldClassName/$newClassName/g" {} +
    fi
  fi
}

# Ask for new names for SimplePlugin and SimpleProver, then rename them
read -p "Enter the new name for SimplePlugin [SimplePlugin]: " simplePluginName
simplePluginName=${simplePluginName:-SimplePlugin}
rename_class "SimplePlugin" "$simplePluginName"

read -p "Enter the new name for SimpleProver [SimpleProver]: " simpleProverName
simpleProverName=${simpleProverName:-SimpleProver}
rename_class "SimpleProver" "$simpleProverName"

echo "Template customization complete."
