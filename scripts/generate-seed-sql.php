<?php

declare(strict_types=1);

$source = dirname(__DIR__) . '/data/products.json';
$products = json_decode(file_get_contents($source), true, 64, JSON_THROW_ON_ERROR);
$categoryNames = [
    'frenos' => 'Frenos',
    'motor' => 'Motor',
    'suspension' => 'Suspensión',
    'electrico' => 'Eléctrico',
    'aceites' => 'Aceites',
    'llantas' => 'Llantas',
];

$quote = static fn (string $value): string => "'" . str_replace(
    ["\\", "'", "\0", "\n", "\r", "\x1a"],
    ["\\\\", "''", "\\0", "\\n", "\\r", "\\Z"],
    $value
) . "'";

$lines = [
    '-- Catálogo inicial de NUBO. Puede ejecutarse nuevamente sin duplicar productos.',
    'START TRANSACTION;',
    '',
    'INSERT INTO categories (name, slug, is_active) VALUES',
];

$categoryRows = [];
foreach ($categoryNames as $slug => $name) {
    $categoryRows[] = sprintf('    (%s, %s, TRUE)', $quote($name), $quote($slug));
}
$lines[] = implode(",\n", $categoryRows);
$lines[] = 'ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = TRUE;';
$lines[] = '';
$lines[] = 'INSERT INTO products';
$lines[] = '    (category_id, sku, name, brand, description, price, stock, image_url, is_active)';
$lines[] = 'VALUES';

$productRows = [];
$skus = [];
foreach ($products as $product) {
    $sku = 'NUBO-' . str_pad((string) $product['id'], 4, '0', STR_PAD_LEFT);
    $skus[] = $sku;
    $productRows[] = sprintf(
        '    ((SELECT id FROM categories WHERE slug = %s), %s, %s, %s, %s, %s, %d, %s, TRUE)',
        $quote($product['categoria']),
        $quote($sku),
        $quote($product['nombre']),
        $quote($product['marca']),
        $quote($product['descripcion']),
        number_format((float) $product['precio'], 2, '.', ''),
        (int) $product['stock'],
        $quote($product['imagen'])
    );
}
$lines[] = implode(",\n", $productRows);
$lines[] = 'ON DUPLICATE KEY UPDATE';
$lines[] = '    category_id = VALUES(category_id),';
$lines[] = '    name = VALUES(name),';
$lines[] = '    brand = VALUES(brand),';
$lines[] = '    description = VALUES(description),';
$lines[] = '    price = VALUES(price),';
$lines[] = '    stock = VALUES(stock),';
$lines[] = '    image_url = VALUES(image_url),';
$lines[] = '    is_active = TRUE;';
$lines[] = '';
$lines[] = 'DELETE pc';
$lines[] = 'FROM product_compatibilities pc';
$lines[] = 'JOIN products p ON p.id = pc.product_id';
$lines[] = 'WHERE p.sku IN (' . implode(', ', array_map($quote, $skus)) . ');';
$lines[] = '';
$lines[] = 'INSERT INTO product_compatibilities (product_id, vehicle_description) VALUES';

$compatibilityRows = [];
foreach ($products as $product) {
    $sku = 'NUBO-' . str_pad((string) $product['id'], 4, '0', STR_PAD_LEFT);
    foreach ($product['compatibilidad'] ?? [] as $compatibility) {
        $compatibilityRows[] = sprintf(
            '    ((SELECT id FROM products WHERE sku = %s), %s)',
            $quote($sku),
            $quote($compatibility)
        );
    }
}
$lines[] = implode(",\n", $compatibilityRows) . ';';
$lines[] = '';
$lines[] = 'COMMIT;';
$lines[] = '';
$lines[] = 'SELECT COUNT(*) AS total_productos_nubo';
$lines[] = 'FROM products';
$lines[] = "WHERE sku LIKE 'NUBO-%';";

echo implode("\n", $lines) . "\n";
