(function(){
    //展开收起
    $('.index-column-more').on('click',function(){
        var index = $('.index-column-more').index($(this));
        var txt = $('.index-column-more').eq(index).text();
        if(txt == "展开"){
            $('.index-column-more').eq(index).text("收起");
            $('.index-column-more').eq(index).parent('.index-column').next('.column-form-firstline').css({'overflow':'visible','height':'auto'});
        }else{
            $('.index-column-more').eq(index).text("展开");
            $('.index-column-more').eq(index).parent('.index-column').next('.column-form-firstline').css({'overflow':'hidden','height':'5.4rem'});
        }            
        // _index.on('click',function(){
        //     _index.eq(n).parent('.content-title').siblings('.content-container').css({'overflow':'visible','height':'auto'});
        // })            
    })
    //展开收起是否显示
    $('.column-form-firstline').each(function(n){
        var num = $('.column-form-firstline').eq(n).children('.column-form-item').length;
        if(num < 5){
            $('.column-form-firstline').eq(n).css({'height':'auto','overflow':'visible'});
            $('.column-form-firstline').eq(n).prev('.index-column').children('.index-column-more').hide();
        }
    })
})();