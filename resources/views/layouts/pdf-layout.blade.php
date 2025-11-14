<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>@yield('title')</title>

    {{-- Load CSS --}}
    @php
        $cssPath = public_path('template/assets/css/template-style.css');
    @endphp

    @if(file_exists($cssPath))
        <style>
            {!! file_get_contents($cssPath) !!}
        </style>
    @endif

    <style>
        /* Set layout ke ukuran A4 potrait */
        @page {
            size: A4 portrait;
            margin: 25mm 20mm 25mm 20mm;
        }

        body {
            margin: 0;
            padding: 0;
        }

        hr {
            border: none;
            border-top: 1px solid #000;
            margin: 10px 0 20px 0;
        }
    </style>
</head>
<body>

    {{-- Convert logo jadi base64 biar aman di semua mode --}}
    @php
        $logoPath = public_path('template/assets/company-templates/logo-jinan.png');
        $base64Logo = '';
        if (file_exists($logoPath)) {
            $type = pathinfo($logoPath, PATHINFO_EXTENSION);
            $data = file_get_contents($logoPath);
            $base64Logo = 'data:image/' . $type . ';base64,' . base64_encode($data);
        }
    @endphp

    <div class="header">
        @if($base64Logo)
            <img src="{{ $base64Logo }}" alt="Logo" class="logo" style="max-width: 120px; max-height: 80px; width: auto; height: auto;">
        @endif
        <div class="company-info">
            <h3 style="margin-bottom: 5px;">{{ $company['name'] }}</h3>
            <p style="margin-top: 0px;">{{ $company['address'] }}</p>
        </div>
    </div>

    <hr>

    {{-- Konten utama dari child view --}}
    @yield('content')

</body>
</html>
