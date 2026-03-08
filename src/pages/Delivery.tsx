import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, Info, X, MessageCircle, Clock, CreditCard, Wallet, Banknote, Truck, Target, Trash2, ArrowLeft, Send, MapPin, Bike, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useCreateDeliveryOrder } from '@/hooks/useDeliveryOrders';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Product {
    id: string;
    category: string;
    name: string;
    description: string;
    price: number;
    points: number;
    image: string;
}

export default function Delivery() {
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [observation, setObservation] = useState('');
    const [cart, setCart] = useState<{ product: Product, quantity: number, observation: string }[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<{ id: string, name: string, fee: number | string }[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'menu' | 'cart'>('menu');
    const [checkoutForm, setCheckoutForm] = useState({
        customer_name: '',
        customer_phone: '',
        order_type: 'delivery',
        delivery_address: '',
        delivery_number: '',
        delivery_neighborhood: '',
        delivery_complement: '',
        payment_method: 'Dinheiro',
        scheduling: 'Agora',
        change_for: '',
    });

    const createOrder = useCreateDeliveryOrder();

    const getApiUrl = () => {
        const apiUrl = import.meta.env.VITE_API_URL;
        if (apiUrl && apiUrl !== '/api') return apiUrl.replace(/\/$/, '');
        if (window.location.pathname.includes('/projetofiscal/')) return '/projetofiscal/api';
        return '/api';
    };

    const { slug } = useParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Carregar dados salvos do cliente
        const saved = localStorage.getItem('delivery_customer_data');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setCheckoutForm(prev => ({
                    ...prev,
                    ...data
                }));
            } catch (e) {
                console.error("Error parsing saved customer data", e);
            }
        }

        const fetchUrl = slug
            ? `${getApiUrl()}/public_delivery.php?slug=${slug}`
            : `${getApiUrl()}/public_delivery.php`;

        fetch(fetchUrl)
            .then(async res => { // Modified to handle non-ok responses
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || "Não foi possível carregar a loja.");
                }
                return res.json();
            })
            .then((data: { settings: any, products: Product[], neighborhoods?: any[], payment_methods?: any[] }) => {
                setProducts(data.products || []);
                setSettings(data.settings);
                setNeighborhoods(data.neighborhoods || []);
                setPaymentMethods(data.payment_methods || []);
                const uniqueCategories = Array.from(new Set((data.products || []).map(p => p.category)));
                setCategories(uniqueCategories);
                if (uniqueCategories.length > 0) {
                    setActiveCategory(uniqueCategories[0]);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load delivery products", err);
                setError(err.message);
                setIsLoading(false);
            });
    }, [slug]);

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
                <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full flex flex-col items-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                        <Info size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Ops!</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Button onClick={() => window.location.href = '/'}>Página Inicial</Button>
                </div>
            </div>
        );
    }

    const cartTotalItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const cartTotalPrice = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    const currentDeliveryFee = React.useMemo(() => {
        if (checkoutForm.order_type !== 'delivery') return 0;
        if (!checkoutForm.delivery_neighborhood) return Number(settings?.delivery_fee || 0);

        const neighborhood = neighborhoods.find(n => n.name === checkoutForm.delivery_neighborhood);
        return neighborhood ? Number(neighborhood.fee) : Number(settings?.delivery_fee || 0);
    }, [checkoutForm.order_type, checkoutForm.delivery_neighborhood, neighborhoods, settings]);

    const totalOrderValue = cartTotalPrice + currentDeliveryFee;

    const handleAddToCart = () => {
        if (selectedProduct) {
            const existingIndex = cart.findIndex(item => item.product.id === selectedProduct.id && item.observation === observation);
            if (existingIndex >= 0) {
                const newCart = [...cart];
                newCart[existingIndex].quantity += quantity;
                setCart(newCart);
            } else {
                setCart([...cart, { product: selectedProduct, quantity, observation }]);
            }
            setSelectedProduct(null);
            setQuantity(1);
            setObservation('');
            toast.success('Adicionado ao carrinho!');
        }
    };

    const removeFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const updateCartItemQty = (index: number, delta: number) => {
        const newCart = [...cart];
        newCart[index].quantity = Math.max(1, newCart[index].quantity + delta);
        setCart(newCart);
    };

    const handleCheckoutSubmit = () => {
        if (!checkoutForm.customer_name) return toast.error("Preencha seu nome");
        if (!checkoutForm.customer_phone) return toast.error("Preencha seu WhatsApp");
        if (checkoutForm.order_type === 'delivery' && !checkoutForm.delivery_address) return toast.error("Preencha seu endereço");

        const orderData = {
            customer_name: checkoutForm.customer_name,
            customer_phone: checkoutForm.customer_phone,
            delivery_address: checkoutForm.order_type === 'delivery'
                ? `${checkoutForm.delivery_address}, ${checkoutForm.delivery_number} - ${checkoutForm.delivery_neighborhood}${checkoutForm.delivery_complement ? ' (' + checkoutForm.delivery_complement + ')' : ''}`
                : 'Retirada no Balcão',
            order_type: checkoutForm.order_type,
            payment_method: checkoutForm.payment_method,
            change_for: checkoutForm.change_for,
            subtotal: cartTotalPrice,
            delivery_fee: currentDeliveryFee,
            total: totalOrderValue,
            items: cart.map(it => ({
                product_id: it.product.id,
                product_name: it.product.name,
                quantity: it.quantity,
                price: it.product.price,
                observation: it.observation
            })),
            source: 'public',
            company_id: settings?.company_id
        };

        createOrder.mutate(orderData, {
            onSuccess: (res) => {
                let message = `*NOVO PEDIDO #${res.id.slice(0, 4)}*\n\n`;
                message += `*Cliente:* ${orderData.customer_name}\n`;
                message += `*Fone:* ${orderData.customer_phone}\n`;
                message += `*Tipo:* ${orderData.order_type === 'delivery' ? 'Entrega 🛵' : 'Retirada 🛍️'}\n`;
                if (orderData.order_type === 'delivery') message += `*Endereço:* ${orderData.delivery_address}\n`;
                message += `*Pagamento:* ${orderData.payment_method}\n\n`;
                message += `*ITENS:*\n`;
                orderData.items.forEach(it => {
                    message += `• ${it.quantity}x ${it.product_name} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(it.price) * it.quantity)}\n`;
                    if (it.observation) message += `   _Obs: ${it.observation}_\n`;
                });
                message += `\n*Subtotal:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderData.subtotal)}\n`;
                if (orderData.delivery_fee > 0) message += `*Taxa:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderData.delivery_fee)}\n`;
                message += `*TOTAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderData.total)}*\n`;

                if (checkoutForm.payment_method === 'Dinheiro' && checkoutForm.change_for) {
                    const changeValue = Number(checkoutForm.change_for.replace(',', '.'));
                    if (changeValue > orderData.total) {
                        const changeAmount = changeValue - orderData.total;
                        message += `*Troco para:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(changeValue)}\n`;
                        message += `*Valor do Troco:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(changeAmount)}\n`;
                    }
                }

                const waUrl = `https://wa.me/${settings?.whatsapp_number?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                window.open(waUrl, '_blank');

                // Salvar dados do cliente para a próxima vez
                const savedData = {
                    customer_name: checkoutForm.customer_name,
                    customer_phone: checkoutForm.customer_phone,
                    delivery_address: checkoutForm.delivery_address,
                    delivery_number: checkoutForm.delivery_number,
                    delivery_neighborhood: checkoutForm.delivery_neighborhood,
                    delivery_complement: checkoutForm.delivery_complement
                };
                localStorage.setItem('delivery_customer_data', JSON.stringify(savedData));

                setCart([]);
                setView('menu');
                toast.success("Pedido enviado com sucesso!");
            }
        });
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const productsByCategory = filteredProducts.reduce((acc, product) => {
        if (!acc[product.category]) {
            acc[product.category] = [];
        }
        acc[product.category].push(product);
        return acc;
    }, {} as Record<string, Product[]>);

    const primaryColor = settings?.primary_color || '#facc15';
    const logoUrl = settings?.logo_url || "https://images.unsplash.com/photo-1550547660-d9450f859349?w=100&h=100&fit=crop";
    const bannerUrl = settings?.banner_url || null;
    const greetingText = settings?.greeting_text || "Boa noite, cliente";
    const wppNumber = settings?.whatsapp_number ? `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}` : "#";

    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-800">
            {view === 'menu' && (
                <>
                    {/* Header Banner */}
                    <div className="bg-white shadow-sm relative z-10 flex flex-col gap-4 max-w-3xl mx-auto overflow-hidden">
                        {bannerUrl && (
                            <div className="w-full h-32 bg-gray-200">
                                <img src={bannerUrl} className="w-full h-full object-cover" alt="Banner" />
                            </div>
                        )}
                        <div className="px-4 pt-4 pb-4 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3 items-center">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 border-4 border-white shadow-md z-10" style={{ marginTop: bannerUrl ? '-48px' : '0' }}>
                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                    </div>
                                    <div className={bannerUrl ? 'pt-2' : ''}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span style={{ backgroundColor: primaryColor }} className="text-black text-xs font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">Agendar Pedido</span>
                                            <Info size={16} className="text-gray-500" />
                                        </div>
                                        {settings?.whatsapp_number && (
                                            <a href={wppNumber} target="_blank" rel="noreferrer" className="flex items-center text-sm font-semibold gap-1 text-gray-700 hover:text-black transition-colors">
                                                <MessageCircle size={16} />
                                                WhatsApp
                                            </a>
                                        )}
                                    </div>
                                </div>

                            </div>

                            <div style={{ backgroundColor: primaryColor }} className="text-black font-bold text-center py-3 rounded-md shadow-sm">
                                {greetingText}
                            </div>
                        </div>
                    </div>

                    <div className="max-w-3xl mx-auto px-4 mt-4">
                        {/* Categories Carousel */}
                        {categories.length > 0 && (
                            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide mb-4">
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setActiveCategory(category)}
                                        style={activeCategory === category ? { backgroundColor: primaryColor, color: '#000' } : {}}
                                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${activeCategory === category
                                            ? 'shadow-sm'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Search Bar */}
                        <div className="relative mb-6">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 sm:text-sm shadow-sm"
                                placeholder="Digite para buscar um item"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Product List */}
                        <div className="flex flex-col gap-6">
                            {Object.entries(productsByCategory).map(([category, products]) => (
                                <div key={category} className="mb-2">
                                    <div style={{ backgroundColor: primaryColor }} className="py-2 mb-3 rounded shadow-sm">
                                        <h2 className="text-xl font-bold text-center text-black uppercase">{category}</h2>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {products.map(product => (
                                            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex relative">
                                                {product.points > 0 && (
                                                    <div className="absolute top-0 right-1/2 translate-x-1/2 bg-[#20b2aa] text-white text-[10px] font-bold px-2 py-0.5 rounded-b-md">
                                                        Fidelidade - {product.points} pts
                                                    </div>
                                                )}

                                                <div className="w-28 h-28 shrink-0 bg-gray-100 p-2">
                                                    <div className="w-full h-full rounded bg-black flex items-center justify-center overflow-hidden">
                                                        <img src={product.image && product.image !== 'null' ? product.image : 'https://via.placeholder.com/200?text=Sem+Foto'} alt={product.name} className="w-full h-full object-cover" />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col flex-1 p-3">
                                                    <h3 className="text-base font-bold text-gray-900 leading-tight">{product.name}</h3>
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>

                                                    <div className="mt-auto flex items-center justify-between pt-2">
                                                        <span className="font-bold text-gray-900">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedProduct(product);
                                                                setQuantity(1);
                                                                setObservation('');
                                                            }}
                                                            className="bg-black text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-gray-800 transition-colors"
                                                        >
                                                            Pedir
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {isLoading ? (
                                <div className="text-center py-10 text-gray-500 font-medium flex flex-col items-center justify-center gap-2">
                                    <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Carregando cardápio...</span>
                                </div>
                            ) : Object.keys(productsByCategory).length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    Nenhum item encontrado.
                                </div>
                            ) : null}
                        </div>
                    </div>
                </>
            )}

            {/* Modal de Carrinho / Checkout */}
            {view === 'cart' && (
                <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
                    <div className="max-w-3xl mx-auto min-h-screen flex flex-col bg-gray-50">
                        {/* Header Checkout */}
                        <div className="bg-white p-4 border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
                            <button onClick={() => setView('menu')} className="flex items-center text-gray-700 hover:text-black">
                                <ArrowLeft className="mr-2" size={20} />
                                <span className="font-bold text-sm">Voltar ao cardápio</span>
                            </button>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <ShoppingCart size={20} /> Carrinho
                            </h2>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Sessão 1: Itens do Carrinho */}
                            <div className="bg-white rounded-lg border p-4 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2 text-gray-600">
                                        <ShoppingCart className="text-gray-400" size={18} /> Carrinho
                                    </h3>
                                    <button onClick={() => setView('menu')} className="bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded uppercase hover:bg-red-700 transition-colors">
                                        + ADICIONAR ITENS
                                    </button>
                                </div>

                                <div className="divide-y">
                                    {cart.length === 0 ? (
                                        <div className="py-8 text-center text-gray-400 font-medium">Seu carrinho está vazio.</div>
                                    ) : cart.map((item, idx) => (
                                        <div key={idx} className="py-4 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="flex items-center gap-2 bg-gray-50 border rounded p-1">
                                                    <button onClick={() => updateCartItemQty(idx, -1)} className="p-1 text-gray-600 hover:text-black"><Minus size={14} /></button>
                                                    <span className="font-bold text-red-600 min-w-[20px] text-center text-sm">{item.quantity}x</span>
                                                    <button onClick={() => updateCartItemQty(idx, 1)} className="p-1 text-gray-600 hover:text-black"><Plus size={14} /></button>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 text-sm tracking-tight leading-none mb-1">{item.product.name}</span>
                                                    {item.observation && <span className="text-[10px] text-gray-400 italic">Obs: {item.observation}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold whitespace-nowrap text-sm text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price * item.quantity)}</span>
                                                <button onClick={() => removeFromCart(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {cart.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-medium">Subtotal do pedido:</span>
                                            <span className="font-bold text-gray-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotalPrice)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-medium">Taxa de entrega:</span>
                                            <span className="font-bold text-gray-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentDeliveryFee)}</span>
                                        </div>
                                        <div className="flex justify-between text-base font-black pt-2 border-t mt-2">
                                            <span>Total:</span>
                                            <span className="text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOrderValue)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sessão 2: Tipo de Entrega e Agendamento */}
                            <div className="bg-white rounded-lg border p-4 shadow-sm">
                                <h3 className="font-bold text-gray-700 text-sm mb-4">Tipo de pedido</h3>
                                <div className="flex gap-4">
                                    <label className={`flex items-center gap-2 cursor-pointer flex-1 p-3 border rounded-lg transition-all ${checkoutForm.order_type === 'delivery' ? 'border-red-500 bg-red-50/30' : 'hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="order_type"
                                            checked={checkoutForm.order_type === 'delivery'}
                                            onChange={() => setCheckoutForm({ ...checkoutForm, order_type: 'delivery' })}
                                            className="text-red-600 hidden"
                                        />
                                        <Bike size={20} className={checkoutForm.order_type === 'delivery' ? 'text-red-600' : 'text-gray-400'} />
                                        <span className={`text-sm font-bold ${checkoutForm.order_type === 'delivery' ? 'text-red-600' : 'text-gray-600'}`}>Delivery</span>
                                    </label>
                                    <label className={`flex items-center gap-2 cursor-pointer flex-1 p-3 border rounded-lg transition-all ${checkoutForm.order_type === 'retira' ? 'border-red-500 bg-red-50/30' : 'hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="order_type"
                                            checked={checkoutForm.order_type === 'retira'}
                                            onChange={() => setCheckoutForm({ ...checkoutForm, order_type: 'retira' })}
                                            className="text-red-600 hidden"
                                        />
                                        <ShoppingCart size={20} className={checkoutForm.order_type === 'retira' ? 'text-red-600' : 'text-gray-400'} />
                                        <span className={`text-sm font-bold ${checkoutForm.order_type === 'retira' ? 'text-red-600' : 'text-gray-600'}`}>Retirada</span>
                                    </label>
                                </div>

                                <div className="mt-6 space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-bold">
                                        <Clock size={16} className="text-gray-700" />
                                        <span>*Agende seu pedido <span className="text-red-600">(obrigatório)</span></span>
                                    </div>
                                    <select
                                        className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-1 focus:ring-red-500 appearance-none bg-white font-medium"
                                        value={checkoutForm.scheduling}
                                        onChange={(e) => setCheckoutForm({ ...checkoutForm, scheduling: e.target.value })}
                                    >
                                        <option value="Agora">Enviar Agora</option>
                                        <option value="15min">Em 15 minutos</option>
                                        <option value="30min">Em 30 minutos</option>
                                        <option value="1h">Em 1 hora</option>
                                    </select>
                                </div>
                            </div>

                            {/* Sessão 3: Forma de Pagamento */}
                            <div className="bg-white rounded-lg border p-4 shadow-sm">
                                <h3 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2">
                                    <Wallet size={18} /> Forma de pagamento
                                </h3>
                                <div className="space-y-3">
                                    {(paymentMethods.length > 0 ? paymentMethods : [{ id: '1', name: 'Dinheiro' }, { id: '2', name: 'PIX (chave exibida após o envio)' }, { id: '3', name: 'Cartão de Débito' }, { id: '4', name: 'Cartão de Crédito' }]).map((m) => (
                                        <div key={m.id} className="space-y-2">
                                            <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-md hover:bg-gray-50 transition-colors">
                                                <input
                                                    type="radio"
                                                    name="payment_method"
                                                    checked={checkoutForm.payment_method === m.name}
                                                    onChange={() => setCheckoutForm({ ...checkoutForm, payment_method: m.name })}
                                                    className="w-4 h-4 text-red-600"
                                                />
                                                <span className="text-sm font-medium text-gray-700">{m.name}</span>
                                            </label>

                                            {m.name === 'Dinheiro' && checkoutForm.payment_method === 'Dinheiro' && (
                                                <div className="pl-7 pb-2 animate-in slide-in-from-top-1 duration-200">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Precisa de troco para quanto?</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                                                        <input
                                                            type="text"
                                                            placeholder="0,00"
                                                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-red-500 font-bold text-gray-700"
                                                            value={checkoutForm.change_for}
                                                            onChange={e => setCheckoutForm({ ...checkoutForm, change_for: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sessão 4: Dados do Cliente */}
                            <div className="bg-white rounded-lg border p-4 shadow-sm space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Nome (apenas 1ª vez)</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded p-3 text-sm focus:ring-1 focus:ring-red-500 font-medium"
                                        value={checkoutForm.customer_name}
                                        onChange={e => setCheckoutForm({ ...checkoutForm, customer_name: e.target.value })}
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Seu WhatsApp (somente dígitos)</label>
                                    <input
                                        type="tel"
                                        className="w-full border border-gray-200 rounded p-3 text-sm focus:ring-1 focus:ring-red-500 font-medium"
                                        value={checkoutForm.customer_phone}
                                        onChange={e => setCheckoutForm({ ...checkoutForm, customer_phone: e.target.value })}
                                        placeholder="(99) 99999-9999"
                                    />
                                </div>
                            </div>

                            {/* Sessão 5: Endereço */}
                            {checkoutForm.order_type === 'delivery' && (
                                <div className="bg-white rounded-lg border p-4 shadow-sm space-y-4">
                                    <h3 className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2">
                                        <MapPin size={18} /> Endereço de Entrega
                                    </h3>
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 mb-1 block flex items-center gap-1 uppercase">
                                            <Target size={12} /> Logradouro / Rua
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full border border-gray-200 rounded p-3 text-sm focus:ring-1 focus:ring-red-500 font-medium"
                                            value={checkoutForm.delivery_address}
                                            onChange={e => setCheckoutForm({ ...checkoutForm, delivery_address: e.target.value })}
                                            placeholder="Nome da rua ou avenida"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Número</label>
                                            <input
                                                type="text"
                                                className="w-full border border-gray-200 rounded p-3 text-sm focus:ring-1 focus:ring-red-500 font-medium"
                                                value={checkoutForm.delivery_number}
                                                onChange={e => setCheckoutForm({ ...checkoutForm, delivery_number: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Bairro / Condomínio</label>
                                            {neighborhoods.length > 0 ? (
                                                <select
                                                    className="w-full border border-gray-200 rounded p-3 text-sm focus:ring-1 focus:ring-red-500 font-medium bg-white"
                                                    value={checkoutForm.delivery_neighborhood}
                                                    onChange={e => setCheckoutForm({ ...checkoutForm, delivery_neighborhood: e.target.value })}
                                                >
                                                    <option value="">Selecione seu bairro</option>
                                                    {neighborhoods.map(n => (
                                                        <option key={n.id} value={n.name}>{n.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded p-3 text-sm focus:ring-1 focus:ring-red-500 font-medium"
                                                    value={checkoutForm.delivery_neighborhood}
                                                    onChange={e => setCheckoutForm({ ...checkoutForm, delivery_neighborhood: e.target.value })}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 mb-1 block uppercase">APTO / Referência / Complemento</label>
                                        <input
                                            type="text"
                                            className="w-full border border-gray-200 rounded p-3 text-sm focus:ring-1 focus:ring-red-500 font-medium"
                                            value={checkoutForm.delivery_complement}
                                            onChange={e => setCheckoutForm({ ...checkoutForm, delivery_complement: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Botão Finalizar */}
                            <div className="pb-10 pt-4">
                                <button
                                    onClick={handleCheckoutSubmit}
                                    disabled={cart.length === 0 || createOrder.isPending}
                                    className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:bg-gray-300 text-white font-black py-4 rounded-lg shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95"
                                >
                                    {createOrder.isPending ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                                    ENVIAR PEDIDO POR WHATSAPP
                                </button>
                                <p className="text-[10px] text-center text-gray-400 mt-4 uppercase tracking-widest font-bold">
                                    Ao clicar em enviar seu pedido será processado
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Cart Bar (Mobile/Bottom) */}
            {cartTotalItemCount > 0 && view === 'menu' && (
                <div className="fixed bottom-0 left-0 right-0 p-4 z-40 flex justify-center pointer-events-none">
                    <div className="max-w-3xl w-full pointer-events-auto">
                        <button
                            onClick={() => setView('cart')}
                            className="w-full bg-[#f97316] hover:bg-[#ea580c] transition-colors text-white rounded-md shadow-lg py-3 px-4 flex items-center justify-center font-bold text-sm"
                        >
                            <ShoppingCart className="w-5 h-5 mr-2" />
                            {cartTotalItemCount} {cartTotalItemCount === 1 ? 'item' : 'itens'} = {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOrderValue)}
                            <span className="ml-2 uppercase bg-white/20 px-2 py-1 rounded text-xs tracking-wider font-extrabold">Ver carrinho</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Product Customization Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setSelectedProduct(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors z-10 bg-white/80 rounded-full p-1"
                        >
                            <X size={24} />
                        </button>

                        <div className="p-0">
                            <div className="flex p-4 border-b border-gray-100">
                                <div className="w-24 h-24 bg-black rounded shrink-0 mr-4 overflow-hidden">
                                    <img src={selectedProduct.image && selectedProduct.image !== 'null' ? selectedProduct.image : 'https://via.placeholder.com/200'} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="pt-2">
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedProduct.name}</h2>
                                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{selectedProduct.description}</p>
                                </div>
                            </div>

                            <div className="p-4 space-y-6">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Existe alguma observação?"
                                        value={observation}
                                        onChange={(e) => setObservation(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-3 text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                                    />
                                </div>

                                <div className="flex flex-col items-center gap-4 py-2">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="bg-gray-800 text-white p-2 rounded hover:bg-black transition-colors"
                                        >
                                            <Minus size={20} />
                                        </button>
                                        <div className="w-16 border border-gray-300 rounded text-center py-2 font-bold text-lg">
                                            {quantity}
                                        </div>
                                        <button
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="bg-gray-800 text-white p-2 rounded hover:bg-black transition-colors"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleAddToCart}
                                        className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-black py-3 px-4 rounded shadow transition-colors flex justify-center items-center gap-2"
                                    >
                                        Adicionar - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProduct.price * quantity)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
